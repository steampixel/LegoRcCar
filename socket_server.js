var http = require('http');
var socket = require('socket.io');
var PwmDriver = require('adafruit-i2c-pwm-driver');
var gpio = require('rpi-gpio');
var static = require('node-static');
//var spawn = require("child_process").spawn;
var exec = require('child_process').exec;

/*
	Set up pins
*/
var pin_gpio_led = 22;
var pin_gpio_engine_forward = 26
var pin_gpio_engine_backward = 24

var pin_pwm_led = 0;
var pin_pwm_engine = 4;
var pin_pwm_servo_left = 15;
var pin_pwm_servo_right = 14;


/* 
    Vars
*/
var min_speed = 0;
var max_speed = 100;
var engine_min_pulse = 600;
var engine_max_pulse = 4095;
var led_min_pulse = 0;
var led_max_pulse = 4095;

/*
	Init Gpio Pins
*/
gpio.setup(pin_gpio_led, gpio.DIR_OUT, function(){
	console.log('gpio pin '+pin_gpio_led+' ready');
});
gpio.setup(pin_gpio_engine_forward, gpio.DIR_OUT, function(){
	console.log('gpio pin '+pin_gpio_engine_forward+' ready');
});
gpio.setup(pin_gpio_engine_backward, gpio.DIR_OUT,function(){
	console.log('gpio pin '+pin_gpio_engine_backward+' ready');
});

/*
	Init Pwm
*/
pwm = new PwmDriver(0x40);
pwm.setPWMFreq(60);

/*
	Functions
*/
function setLedBrightness(brightness){
    
    var pulse = led_min_pulse+brightness;//Add the brightness to the minimum pulse
    
    if(pulse<led_min_pulse){pulse=0;}
    if(pulse>led_max_pulse){pulse=led_max_pulse;}
    
    pwm.setPWM(pin_pwm_led,0,pulse);
}

function setLedStatus(status){
    if(status=='on'){
        gpio.write(pin_gpio_led, true, function(err) {	if (err) throw err;});
    }
    if(status=='off'){
        gpio.write(pin_gpio_led, false, function(err) {	if (err) throw err;});
    }
}

function setEnginePulse(pulse){

    if(pulse<engine_min_pulse){pulse=0;}//Set pulse lower than 600 to 0 because the engine will not turn below this value
    if(pulse>engine_max_pulse){pulse=engine_max_pulse;}//The engine will not work above this value

    //set engine pwm
    pwm.setPWM(pin_pwm_engine,0,pulse);
}

function setEngineDirection(direction){
    
    //console.log(direction);
    
    if(direction=='forward'){
        gpio.write(pin_gpio_engine_forward, true, function(err) {if (err) throw err;	});
        gpio.write(pin_gpio_engine_backward, false, function(err) {if (err) throw err;	});
    }
    if(direction=='backward'){
        gpio.write(pin_gpio_engine_forward, false, function(err) {if (err) throw err;	});
        gpio.write(pin_gpio_engine_backward, true, function(err) {if (err) throw err;	});
    }
    if(direction=='off'){
        gpio.write(pin_gpio_engine_forward, false, function(err) {if (err) throw err;	});
        gpio.write(pin_gpio_engine_backward, false, function(err) {if (err) throw err;	});
    }
}

function setServoDirection(direction){
    if(direction=='left'){
        pwm.setPWM(pin_pwm_servo_left,0,4095);
        pwm.setPWM(pin_pwm_servo_right,0,0);
    }
    if(direction=='right'){
        pwm.setPWM(pin_pwm_servo_left,0,0);
        pwm.setPWM(pin_pwm_servo_right,0,4095);
    }
    if(direction=='center'){
        pwm.setPWM(pin_pwm_servo_left,0,0);
        pwm.setPWM(pin_pwm_servo_right,0,0);
    }
}

function emercencyStop(){
    console.log('Emergency stop');
    setServoDirection('center');
    setLedStatus('off');
    setEngineDirection('off');
    pwm.stop();
    start_once_started = false;
    enable_picture_stream = false;
}

function takePicture(){
    var d = new Date();
    var pic_path = 'pictures/'+d.getFullYear()+'-'+d.getMonth()+'-'+d.getDate()+'_'+d.getHours()+':'+d.getMinutes()+':'+d.getSeconds()+'.jpg';
    console.log('taking picture '+pic_path);
    //var process = spawn('raspistill',['-vf', '-o', 'public/'+pic_path]);
    exec('raspistill -o public/'+pic_path, function(error, stdout, stderr) {
        io.emit('picture',{path:pic_path});
    });
    
}

var enable_camera_stream = false;
var camera_stream_height = 300;//Max 2592 x 1944
var camera_stream_width = 400;
function cameraStreamLoop(){
    if(enable_camera_stream){
        exec('raspistill -w '+camera_stream_width+' -h '+camera_stream_height+' -t 1 -o - | base64', function(error, stdout, stderr) {
            io.emit('camera-stream',{base64:stdout});
            setTimeout(cameraStreamLoop,1000);
        });
    }
}

var camera_stream_started = false;
function startCameraStream(){
    if(!camera_stream_started){
        console.log('Start camera stream...');
        enable_camera_stream = true;
        camera_stream_started = true;
        cameraStreamLoop();
    }
};

function stopCameraStream(){
   console.log('Stop camera stream...');
   enable_camera_stream = false;
   camera_stream_started = false;
}

/* Kalkuliert einen beliebigen X-Wert anhand eines Y-Wertes auf einer linearen Funktion */
function getLinearX(x1,y1,x2,y2,y3){
    
    //Steigung der linearen Funktion berechnen
    var m = (y2-y1) / (x2-x1) ;

    //Schnittpunkt mit der Y-Achse berechnen
    var b = y1-m * x1;

    //x3 berechnen
    var x3 = (y3 - b) / m;

    return x3;
    
}


/*
	Webserver
*/
console.log('Starting webserver...');

var file = new static.Server('./public');

var app = http.createServer(function (request, response) {
    request.addListener('end', function () {
         file.serve(request, response);
    }).resume();
}).listen(80);

/*
	Socket application
*/
io = socket.listen(app);

io.sockets.on('connection', function(socket){
	
    console.log('Client connected...');

    socket.on('servo',function(data){

        setServoDirection(data.direction);
        
        console.log(data);

    });
    
    socket.on('engine',function(data){

        //Rechne die Geschwindichkeit in Motorpuls um
        var pulse = getLinearX(engine_min_pulse,min_speed,engine_max_pulse,max_speed,data.speed);

        setEnginePulse(pulse);
        setEngineDirection(data.direction);

	console.log(data);
    
    });
    
    socket.on('led',function(data){
        
        console.log(data);
        
        io.emit('led',data);//Send to all clients
        
		//Led
		if(data.intensity!=0){
			setLedStatus('on');
			brightness = data.intensity*50;
			setLedBrightness(brightness);
		}else{
			setLedStatus('off');
		}

	});
    
    socket.on('camera-resulution',function(data){
	console.log('Changing camera resulution to '+data.width+'x'+data.height);
        camera_stream_height = data.height;
	camera_stream_width = data.width;
    });

    socket.on('camera',function(data){
        takePicture();
    });
    
    socket.on('camera-stream', function(data) {
        if(data.status==true){
            startCameraStream();
        }else{
            stopCameraStream();
        }
    });
    
    socket.on('disconnect', function() {
        console.log('Client disconnected');
        emercencyStop();
    });
    
    //Camera Stream
    /*if(!stream_interval){
        stream_interval = setInterval(function(){
            if(!stream_in_process){//Wenn gerade kein Bild gemacht wird
                exec('raspistill -w 160 -h 120 -t 1 -o - | base64', function(error, stdout, stderr) {
                    io.emit('picture-stream',{base64:stdout});
                    stream_in_process = false;//Es können neue Bilder gemacht werden
                });
                stream_in_process = true;//Es wird gerade ein Bild gemacht
            }
        },1000);
    }*/
    
    //startOnce();
    
});


/*
    Stop on Timeout
*/
//setTimeout(function(){ 
    
//}, 500);

/*
    Exit
*/
process.on('SIGINT',function(){
    emercencyStop();
    return process.exit();
});