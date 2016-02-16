﻿//-------------------------------------------------------------------------------------
//  Copyright (c) 2015 - Microsoft Corporation.
//    sandRadial.ts - builds a 2D scatter plot of sand shapes.
//-------------------------------------------------------------------------------------

/// <reference path="../_references.ts" />

module beachParty
{
    export class RadialClass extends BaseGlVisClass
    {
        _cx = 0;
        _cy = 0;
        _maxShapeSize = 1;

        constructor(view: DataViewClass, gl: any, chartState: any, container: HTMLElement, appMgr: AppMgrClass)
        {
            super("sandRadial", view, gl, chartState, container, appMgr);

            this._hideAxes = true;
        }

        buildScales(nv: NamedVectors, rcxWorld, filteredRecordCount: number, facetCount: number)
        {
            //---- modify X and Y scales - force the RANGE to [0..2*PI], [0..maxRadius] ----
            var maxRadius = Math.min(rcxWorld.width/2, rcxWorld.height/2);

            var rcx = utils.cloneMap(rcxWorld);

            //---- scales.x RANGE: 0-2*PI ----
            rcx.left = 0;
            rcx.right = 2 * Math.PI;
            rcx.width = rcxWorld.right - rcxWorld.left;

            //---- scales.y RANGE: 0-maxRadius ----
            rcx.top = maxRadius;
            rcx.bottom = 0;
            rcx.height = rcxWorld.top - rcxWorld.bottom;

            var result = super.buildScales(nv, rcx, filteredRecordCount, facetCount);
            return result;
        }

        preLayoutLoop(dc: DrawContext)
        {
            this._cx = dc.x + dc.width / 2;
            this._cy = dc.y + dc.height / 2;

            this._maxShapeSize = dc.maxShapeSize;
        }

        layoutDataForRecord(i: number, dc: DrawContext, dr: bps.LayoutResult)
        {
            var nv = dc.nvData;
            var scales = dc.scales;

            var theta = -(Math.PI / 2 + this.scaleColData(nv.x, i, scales.x));
            var radius = this.scaleColData(nv.y, i, scales.y);

            dr.x = this._cx + radius * Math.cos(theta);
            dr.y = this._cy + radius * Math.sin(theta);
            dr.z = 0;      

            dr.width = this._maxShapeSize * this.scaleColData(nv.size, i, scales.size, 1);
            dr.height = dr.width;
            dr.depth = dc.defaultDepth2d   

            dr.colorIndex = this.scaleColData(nv.colorIndex, i, scales.colorIndex);
            dr.imageIndex = this.scaleColData(nv.imageIndex, i, dc.scales.imageIndex);
        }
    }
}
 