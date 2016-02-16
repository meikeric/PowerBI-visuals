﻿//-------------------------------------------------------------------------------------
//  Copyright (c) 2016 - Microsoft Corporation.
//    flatRandom.ts - builds a random 2d layout of sand shapes.
//-------------------------------------------------------------------------------------

/// <reference path="../_references.ts" />

module beachParty
{
    export class FlatRandom extends BaseGlVisClass
    {
        _randomX = [];
        _randomY = [];
        _maxShapeSize = 1;
        _nextRandIndex = 0;
        _itemSize = 0;

        constructor(view: DataViewClass, gl: any, chartState: any, container: HTMLElement, appMgr: AppMgrClass)
        {
            super("flatRandom", view, gl, chartState, container, appMgr);

            this._hideAxes = true;
        }

        computeFacetStats(dc: DrawContext, nvFacetBuckets: any[])
        {
            this._itemSize = dc.maxShapeSize;       // dc.itemSize;

            return super.computeFacetStats(dc, nvFacetBuckets);
        }

        buildScales(nv: NamedVectors, rcxWorld, filteredRecordCount: number, facetCount: number)
        {
            var result = super.buildScales(nv, rcxWorld, filteredRecordCount, facetCount);
            var itemSize = this._itemSize;

            //---- override X and Y scales - force the domain to [0..1] ----
            result.x = utils.makeLinearScale(0, 1, rcxWorld.left + itemSize , rcxWorld.right - itemSize);
            result.y = utils.makeLinearScale(0, 1, rcxWorld.bottom + itemSize, rcxWorld.top - itemSize);

            return result;
        }

        preLayoutLoop(dc: DrawContext)
        {
            this._maxShapeSize = dc.maxShapeSize;     
            this._nextRandIndex = 0;
        }

        layoutDataForRecord(i: number, dc: DrawContext, dr: bps.LayoutResult)
        {
            var nv = dc.nvData;
            var scales = dc.scales;
            var ri = 0;

            if (dc.layoutFilterVector && (! dc.layoutFilterVector[i]))
            {
                ri = this._nextRandIndex++;
            }

            var xr = nv.randomX.values[ri];
            var yr = nv.randomY.values[ri];

            dr.x = scales.x.scale(xr);
            dr.y = scales.y.scale(yr);
            dr.z = 0;      

            dr.width = this._maxShapeSize * this.scaleColData(nv.size, i, scales.size, 1);
            dr.height = dr.width;
            dr.depth = dc.defaultDepth2d      // test out 3d cube in a 2d shape

            dr.colorIndex = this.scaleColData(nv.colorIndex, i, scales.colorIndex);
            dr.imageIndex = this.scaleColData(nv.imageIndex, i, dc.scales.imageIndex);
        }
    }
}
 