﻿//-------------------------------------------------------------------------------------
//  Copyright (c) 2016 - Microsoft Corporation.
//    dataTipMgr.ts - manages the data tips on the client.
//-------------------------------------------------------------------------------------

/// <reference path="../_references.ts" />

module beachPartyApp
{
    export class DataTipMgrClass extends beachParty.DataChangerClass 
    {
        private chartHostHelper: bps.ChartHostHelperClass;
        private dataTipMgr: DataTipMgrClass;
        private application: AppClass;
        private settings: AppSettingsMgr;
        private container: HTMLElement;

        _dataTips: DataTipClass[] = [];

        constructor(hostHelper: bps.ChartHostHelperClass, dataTipMgr: DataTipMgrClass, application: AppClass, settings: AppSettingsMgr, container: HTMLElement)
        {
            super();

            this.chartHostHelper = hostHelper;
            this.dataTipMgr = dataTipMgr;
            this.application = application;
            this.settings = settings;
            this.container = container;
        }

        addDataTip(title: string, colNames: string[], includeNames: boolean, pt?: any)
        {
            var rootW = vp.select(this.container, ".dataTipsRoot");

            var dataTip = new DataTipClass(this.dataTipMgr, this.application, this.settings, this.container, rootW[0], bps.ChartHostHelperClass.instance);
            this._dataTips.push(dataTip);

            dataTip.setParams(title, colNames, includeNames);

            dataTip.registerForChange("position", (e) =>
            {
                var rc = dataTip.getPlotBounds();
                var msg = "dataTip: " + vp.geom.rectToString(rc);

                /*appClass.instance*/this.application.quickStats(msg);
            });

            if (pt)
            {
                dataTip.moveToPoint(pt.x, pt.y, true);
            }

            return dataTip;
        }

        getDataTip(primaryKey: string)
        {
            var dataTip = null;
            vp.utils.debug("getDataTip: primaryKey=" + primaryKey + ", dataTips.length=" + this._dataTips.length);

            for (var i = 0; i < this._dataTips.length; i++)
            {
                var dt = this._dataTips[i];
                if (dt._primaryKey === primaryKey)
                {
                    dataTip = dt;
                    break;
                }
            }

            return dataTip;
        }

        closeDataTip(dataTip: DataTipClass)
        {
            dataTip.close();
            this._dataTips.remove(dataTip);
        }

        hideDataTipsBeforeLayout()
        {
            for (var i = 0; i < this._dataTips.length; i++)
            {
                var dt = this._dataTips[i];

                dt.show(false);
            }
        }

        updateDataTipsAfterLayout()
        {
            for (var i = 0; i < this._dataTips.length; i++)
            {
                var dt = this._dataTips[i];

                dt.updateTextAndOffset(dt._primaryKey);
            }
        }

        clearDataTips()
        {
            //---- remove old data tips ----
            vp.select(this.container, ".dataTipsRoot")
                .clear();

            this._dataTips = [];
        }

        getDataFromDataTips(preload: bps.Preload)
        {
            preload.dataTips = [];

            for (var i = 0; i < this._dataTips.length; i++)
            {
                var dataTip = this._dataTips[i];
                var dtd = dataTip.getDataTipData();

                preload.dataTips.push(dtd);
            }
        }
    }
} 