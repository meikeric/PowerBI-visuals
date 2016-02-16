﻿//-------------------------------------------------------------------------------------
//  Copyright (c) 2015 - Microsoft Corporation.
//    slicer.js - describes the column slicer (interactive histogram) panel.
//-------------------------------------------------------------------------------------

/// NOTE about BeachParty panels:
///     - This is a description of how to build our (very regular and simple) panels.  This is not a general panel building system;
///       it will only work for our specific style of panels.
///     - Being a JSON description, we can make panel easier to write, read, and maintain.  We also add our own very 
///       specific kind of data binding.
///     - The hope is by keeping things simple and limited, we can make this easy to build.

module sandDance {
    export module panels {
        export var slicer: any = {
            title: "Slicer",
            tip: "View and select values of a column",
            sizeable: true,
            //autoClose: true,

            rows:
            [
                { fillClient: true, id: "slicer", control: "beachPartyApp.createSlicer", dataName: "slicerData" },
            ]
        };
    }
}