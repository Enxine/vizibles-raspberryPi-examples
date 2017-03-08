// (c) Copyright 2017 Enxine DEV S.C.
// Released under Apache License, version 2.0
// @author: jamartinez@enxine.com
//
// Description: TODO...

var vizibles = require('vizibles');
var y2 = require('yeelight2');

var connected = false;
var lightFound = false;
var light = null;

var properties = {
    power: '',
    bright: '',
    rgb: ''
};

function lightOn() {
    light.set_power('on');
    properties.power = 'on';
    vizibles.update({power: 'on'});
}

function lightOff() {
    light.set_power('off');
    properties.power = 'off';
    vizibles.update({power: 'off'});
}

function toggle() {
    light.toggle();
    if (properties.power == 'on') {
	properties.power = 'off';
	vizibles.update({power: 'off'});
    } else if (properties.power == 'off') {
	properties.power = 'on';
	vizibles.update({power: 'on'});
    }
}

function setBright(brightness) {
    light.set_bright(brightness);
    properties.brightness = brightness;
    vizibles.update({bright: brightness});
}

function setRGB(hexRGB) {
    // 'ColorPicker' widget gives a string with format #rrggbb
    var rgb = parseInt(hexRGB.replace('#', '0x'), 16);
    light.set_rgb(rgb);
    properties.rgb = rgb;
    vizibles.update({rgb: rgb});
}

function getProperties() {
    var promise = light.get_prop(["power", "bright", "rgb"]);
    promise.then(function(result) {
	vizibles.update(result);
    });
}

function exposeFunctions() {
    vizibles.expose('lightOn', lightOn);
    vizibles.expose('lightOff', lightOff);
    vizibles.expose('toggle', toggle);
    vizibles.expose('setRGB', setRGB);
    vizibles.expose('setBright', setBright);
    vizibles.expose('getProperties', getProperties);
}

function checkStatus() {
    setInterval(function() {
	var promise = light.get_prop(["power", "bright", "rgb"]);
	promise.then(function(result) {
	    var status = {};
	    var updateStatus = false;
	    if (result.power && (result.power != '') && (properties.power != result.power)) {
		properties.power = result.power;
		status.power = result.power;
		updateStatus = true;
	    }
	    if (result.bright && (result.bright != '') && (properties.bright != result.bright)) {
		properties.bright = result.bright;
		status.bright = result.bright;
		updateStatus = true;
	    }
	    if (result.rgb && (result.rgb != '') && (properties.rgb != result.rgb)) {
		properties.rgb = result.rgb;
		status.rgb = result.rgb;
		updateStatus = true;
	    }
	    if (updateStatus) {
		//console.log('updating: ' + JSON.stringify(status));
		vizibles.update(status);
	    }
	});
    }, 5000);
}

function onConnected() {
    console.log('Connected to Vizibles!');
    if (!connected) {
        connected = true;
	function goIfReady() {
	    if (lightFound) {
		exposeFunctions();
		getProperties();
		checkStatus();
	    }
	    else setTimeout(goIfReady, 2000);
	}
	goIfReady();
    }
}

function onDisconnected(err) {
    console.log('Disconnected from Vizibles with error: ' + JSON.stringify(err));
    connected = false;
}

vizibles.connect({
    id: 'yeelight-rgbw-bulb',
    // TODO: replace the <TODO> strings with values obtained from Vizibles and
    // then uncomment next line
    //credentials: {keyId: '<TODO>', secret: '<TODO>'},
    onConnected: onConnected, 
    onDisconnected: onDisconnected
});

y2.discover(function(pLight) {
    lightFound = true;
    light = pLight;
    console.log('Bulb found: ' + light.name);
});
