﻿//-------------------------------------------------------------------------------------
//  Copyright (c) 2016 - Microsoft Corporation.
//    flatCircle.ts - builds a phylogenic circle layout of sand shapes.
//-------------------------------------------------------------------------------------

/// <reference path="../_references.ts" />

module beachParty
{
    export class FlatCircle extends BaseGlVisClass
    {
        //_phyloSeed = 137.508;           // "golden angle"
        _maxCount = 0;
        _radius = 0;
        _spacing = 0;
        _nextIndex = 0;         // index to assigned to next unfiltered shape_center = { x: 0, y: 0 };
        _center = { x: 0, y: 0 };
        _maxShapeSize = 1;
        _maxCountOverFacets = 0;

        constructor(view: DataViewClass, gl: any, chartState: any, container: HTMLElement, appMgr: AppMgrClass)
        {
            super("flatCircle", view, gl, chartState, container, appMgr);

            this._hideAxes = true;
        }

        computeFacetStats(dc: DrawContext, nvFacetBuckets: any[])
        {
            this._maxCountOverFacets = ChartUtils.computeMaxCountOverFacets(dc, nvFacetBuckets);
            return this._maxCountOverFacets;
        }

        preLayoutLoop(dc: DrawContext)
        {
            var margin = 2 * dc.maxShapeSize;           //   dc.itemSize;
            var xSize = dc.width - (margin);
            var ySize = dc.height - (margin);

            this._maxCount = dc.filteredRecordCount;
            this._radius = Math.min(xSize, ySize);     
            this._spacing = .5 * this._radius / Math.sqrt(this._maxCount);

            this._nextIndex = 0;

            this._center.x = dc.x + dc.width  / 2;
            this._center.y = dc.y + dc.height / 2;

            this._maxShapeSize = ChartUtils.getScatterShapeSize(dc, this._maxCountOverFacets, this._view);
        }

        
        layoutDataForRecord(i: number, dc: DrawContext, dr: bps.LayoutResult)
        {
            var nv = dc.nvData;
            
            var sp = this._view.spiralParams();
            var filtered = (dc.layoutFilterVector && dc.layoutFilterVector[i]);
            var rowIndex = 0;

            if (!filtered)
            {
                rowIndex = this._nextIndex++;
            }

            //---- filtered code can calc stuff here, but it will not be used ----
            var cx = this._center.x;
            var cy = this._center.y;

            var r = this._spacing * Math.sqrt(rowIndex);
            var theta = Math.PI / 180 * (rowIndex * sp.seed);

            dr.x = cx + r * Math.sin(theta);
            dr.y = cy + r * Math.cos(theta);
            dr.z = 0;      

            dr.width = this._maxShapeSize * this.scaleColData(nv.size, i, dc.scales.size, 1);
            dr.height = dr.width;
            dr.depth = dc.defaultDepth2d      // test out 3d cube in a 2d shape

            dr.colorIndex = this.scaleColData(nv.colorIndex, i, dc.scales.colorIndex);
            dr.imageIndex = this.scaleColData(nv.imageIndex, i, dc.scales.imageIndex);
        }
    }
}
 