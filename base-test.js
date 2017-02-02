// (c) Copyright 2017 Enxine DEV S.C.
// Released under Apache License, version 2.0
// @author: jamartinez@enxine.com
//
// This is the basic example that shows how to connect a Raspberry Pi to
// Vizibles and send data to the platform.
// See details about how to configure an run the example here:
//   https://developers.vizibles.com/en/devices/raspberry/

var vizibles = require('vizibles');

var connected = false;
var testValue = 1;
var increasing = true;

function onConnected() {
    console.log('Connected to Vizibles!');
    if (!connected) {
        connected = true;
        setInterval(function() {
            console.log('Updating \'test\' attribute to: ' + testValue);
            vizibles.update({ 'test': testValue});
            if (increasing) testValue++;
            else testValue--;
            if (testValue > 8) increasing = false;
            if (testValue < 2) increasing = true;
        }, 5000);      
    }
}

function onDisconnected(err) {
    console.log('Disconnected from Vizibles with error: ' + JSON.stringify(err));
    connected = false;
}

vizibles.connect({
    id: 'raspberry-pi',
    // TODO: replace the <TODO> strings with values obtained from Vizibles and
    // then uncomment next line
    //credentials: {keyId: '<TODO>', secret: '<TODO>'}, 
    onConnected: onConnected, 
    onDisconnected: onDisconnected});
