console.log('Here we go :-)');

/*
	Include
*/
//var sleep = require('sleep').sleep;
//var raspi = require('raspi');
//var gpio = require('raspi-gpio');
var PwmDriver = require('adafruit-i2c-pwm-driver');
//var gpio = require("pi-gpio");
var gpio = require('rpi-gpio');
var keypress = require('keypress');
 
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
	Init Gpio Pins
*/
gpio.setup(pin_gpio_led, gpio.DIR_OUT, function(){
	console.log(pin_gpio_led+' ready');
});
gpio.setup(pin_gpio_engine_forward, gpio.DIR_OUT, function(){
	console.log(pin_gpio_engine_forward+' ready');
});
gpio.setup(pin_gpio_engine_backward, gpio.DIR_OUT,function(){
	console.log(pin_gpio_engine_backward+' ready');
});

/*
	Init Pwm
*/
pwm = new PwmDriver(0x40);
pwm.setPWMFreq(60);

var pwm_led_pulse = 100;
var pwm_engine_pulse = 1000;

/*
	Init Keyboard
*/
keypress(process.stdin);
process.stdin.setRawMode(true);
process.stdin.resume();

process.stdin.on('keypress', function (ch, key) {
  
	//console.log(key);
  	
	if(typeof key != 'undefined'){

	if (key && key.ctrl && key.name == 'c') {
	
		return process.exit();

	}else{

		if(key.name=="q"){
			gpio.write(pin_gpio_led, true, function(err) {if (err) throw err;});
		}
		if(key.name=="a"){
			gpio.write(pin_gpio_led, false, function(err) {	if (err) throw err;});
		}
		if(key.name=="w"){
			pwm_led_pulse = pwm_led_pulse+50;
			pwm.setPWM(pin_pwm_led,0,pwm_led_pulse);
			console.log(pwm_led_pulse);
		}
		if(key.name=="s"){
			pwm_led_pulse = pwm_led_pulse-50;
			pwm.setPWM(pin_pwm_led,0,pwm_led_pulse);
			console.log(pwm_led_pulse);	
		}
		if(key.name=="e"){
			pwm_engine_pulse = pwm_engine_pulse + 100;
			pwm.setPWM(pin_pwm_engine,0,pwm_engine_pulse);
			console.log(pwm_engine_pulse);
		}
		if(key.name=="d"){
			pwm_engine_pulse = pwm_engine_pulse - 100;
			pwm.setPWM(pin_pwm_engine,0,pwm_engine_pulse);
			console.log(pwm_engine_pulse);
		}
		if(key.name=="r"){
			gpio.write(pin_gpio_engine_forward, false, function(err) {if (err) throw err;	});
			gpio.write(pin_gpio_engine_backward, false, function(err) {if (err) throw err;	});
		}
		if(key.name=="up"){
			gpio.write(pin_gpio_engine_forward, true, function(err) {if (err) throw err;	});
			gpio.write(pin_gpio_engine_backward, false, function(err) {if (err) throw err;	});
		}
		if(key.name=="down"){
			gpio.write(pin_gpio_engine_forward, false, function(err) {if (err) throw err;	});
			gpio.write(pin_gpio_engine_backward, true, function(err) {if (err) throw err;	});
		}
		if(key.name=="left"){
			pwm.setPWM(pin_pwm_servo_left,0,4095);
			pwm.setPWM(pin_pwm_servo_right,0,0);
		}
		if(key.name=="right"){
			pwm.setPWM(pin_pwm_servo_left,0,0);
			pwm.setPWM(pin_pwm_servo_right,0,4095);
		}
		if(key.name=="f"){
			pwm.setPWM(pin_pwm_servo_left,0,0);
			pwm.setPWM(pin_pwm_servo_right,0,0);
		}


	}

	}
});
 

/*
	EXIT
*/

/*process.on('SIGINT',function(){
	
	console.log('exiting...');
	//pwm.setPWM(0,0,0);
	//pwm.stop();
	return process.exit();

});*/

