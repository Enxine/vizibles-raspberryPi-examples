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

function lightOn() {
    light.set_power('on');
    return ({result: 'OK'});
}

function lightOff() {
    light.set_power('off');
    return ({result: 'OK'});
}

function toggle() {
    light.toggle();
    return ({result: 'OK'});
}

function setRGB(rgb) {
    light.set_rgb(rgb);
    return ({result: 'OK'});
}

function setBright(brightness) {
    light.set_bright(brightness);
    return ({result: 'OK'});
}

function exposeFunctions() {
    console.log('exposeFunctions');
    vizibles.expose('lightOn', lightOn);
    vizibles.expose('lightOff', lightOff);
    vizibles.expose('toggle', toggle);
    vizibles.expose('setRGB', setRGB);
    vizibles.expose('setBright', setBright);
}

function onConnected() {
    console.log('Connected to Vizibles!');
    if (!connected) {
        connected = true;
	function goIfReady() {
	    if (lightFound) exposeFunctions();
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
