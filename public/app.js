var socket = io.connect(window.location.hostname+':8080');

var enable_gyroscope = false;

var led_slider;

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

socket.on('connect',function(){
    $('#connection_status').html('Connected');
});

socket.on('error',function(){
    $('#connection_status').html('Connection Error');
});

socket.on('disconnect',function(){
    $('#connection_status').html('Disconnected');
});

socket.on('camera-stream',function(data){

    $('#camera_stream').html('<img class="img-responsive" style="width:100%;" src="data:image/jpeg;base64,' + data.base64+'"/>');

});

socket.on('picture',function(data){
    
    console.log('recived new picture: '+data.path);
    
    $('#last_picture').html('<img class="img-responsive" src="/'+data.path+'"/>');

});

socket.on('led',function(data){
    
    $("#led_slider").slider('value', data.intensity);
    //led_slider.value(data.intensity);

});

$(function() {

    /*
        Gyroscope Switch
    */
    $('#main_switch').click(function(){
        if($(this).hasClass('btn-success')){
            $(this).removeClass('btn-success');
            $(this).addClass('btn-danger');
            $(this).html($(this).data('on-value'));
            enable_gyroscope = true;
        }else{
            $(this).addClass('btn-success');
            $(this).removeClass('btn-danger');
            $(this).html($(this).data('off-value'));
            enable_gyroscope = false;
            
            //Disable Engines
            socket.emit('servo',{direction:'center'});
            socket.emit('engine',{
                speed:0,
                direction:'off'
            });
        }
    });
    
    /*
        Take Pictures
    */
    $('#camera_button').click(function(){
        
        socket.emit('camera',{foo:'bar'});
        
    });
    
    /*
        Camera Stream
    */
    $('#camera_stream_button').click(function(){
        
        if($(this).hasClass('btn-success')){
            $(this).removeClass('btn-success');
            $(this).addClass('btn-danger');
            $(this).html($(this).data('on-value'));
            
            socket.emit('camera-stream',{status:true});
            
        }else{
            $(this).addClass('btn-success');
            $(this).removeClass('btn-danger');
            $(this).html($(this).data('off-value'));

            socket.emit('camera-stream',{status:false});
            
        }
        
    });
    
    /*
        Camera Resulution
    */
    $('#camera_resulution').on('change', function (e) {
        var selected_value = this.value;
        //console.log(selected_value);
        var selected_values = selected_value.split("x");
	socket.emit('camera-resulution',{width:selected_values[0],height:selected_values[1]});
        //console.log(selected_values);
    });
    
    /* 
        Led slider
    */
    led_slider = $( "#led_slider" ).slider({
        value: 50,
        stop: function( event, ui ) {
            socket.emit('led',{intensity:ui.value});
        }
    });
    
    /*
        Gyroscope
    */
    window.ondeviceorientation = function(event){
        
        if(enable_gyroscope){
        
            //Engine
            var min_speed = 0;
            var max_speed = 100;
            
            if(event.beta<0){//Wenn das Gerät nach Vorne geneigt wird
                
                var min_beta = -20;
                var max_beta = -44;
            
                //Winkel in Geschwindigkeit umrechnen:
                var speed = getLinearX(min_speed,min_beta,max_speed,max_beta,event.beta);

                if(event.beta>min_beta){//Wenn die Neigung zu klein ist...
                    speed = min_speed;
                    var engine_direction = 'off';
                }else{
                    var engine_direction = 'forward';
                }
                
                if(event.beta<max_beta){//Wenn die Neigung zu groß ist...
                    speed = max_speed;
                }
            
            }else{
                
                var min_beta = 20;
                var max_beta = 40;
            
                //Winkel in Geschwindigkeit umrechnen:
                var speed = getLinearX(min_speed,min_beta,max_speed,max_beta,event.beta);
                
                if(event.beta<min_beta){//Wenn die Neigung zu klein ist
                    speed = min_speed;
                    var engine_direction = 'off';
                }else{
                    var engine_direction = 'backward';
                }
                
                if(event.beta>max_beta){//Wenn die Neigung zu groß ist...
                    speed = max_speed;
                }
                
            }
            
            speed = Math.round(speed).toFixed(0);//Runden
            
            //Servo
            var servo_direction = 'center';
            
            if(event.gamma<-20){
                var servo_direction = 'left';
            }
            if(event.gamma>20){
                var servo_direction = 'right';
            }
            
            //HTML
            $('#engine').html('Speed: '+speed+'<br/>Engine: '+engine_direction+'<br/>Servo: '+servo_direction);
            //$('#gyroscope_data').html('Beta: '+event.beta+'<br/>Gamma: '+event.gamma);
            
            //Emit
            socket.emit('servo',{direction:servo_direction});
            socket.emit('engine',{
                speed:speed,
                direction:engine_direction
            });
        }
    };
    
    /*
        Keyboard
    */
    $(document).keydown(function() {

      if (event.which == 38){
            socket.emit('engine',{
                speed:100,
                direction:'forward'
            });
            event.preventDefault();
      }
      
      if (event.which == 40){
            socket.emit('engine',{
                speed:100,
                direction:'backward'
            });
            event.preventDefault();
      }
      
      if (event.which == 37){
            socket.emit('servo',{direction:'left'});
            event.preventDefault();
      }
      
      if (event.which == 39){
            socket.emit('servo',{direction:'right'});
            event.preventDefault();
      }
      
    }); 
    
    $(document).keyup(function() {

      if (event.which == 38){
            socket.emit('engine',{
                speed:100,
                direction:'off'
            });
            event.preventDefault();
      }
      
      if (event.which == 40){
            socket.emit('engine',{
                speed:100,
                direction:'off'
            });
            event.preventDefault();
      }
      
      if (event.which == 37){
            socket.emit('servo',{direction:'center'});
            event.preventDefault();
      }
      
      if (event.which == 39){
            socket.emit('servo',{direction:'center'});
            event.preventDefault();
      }
      
    }); 
    
});