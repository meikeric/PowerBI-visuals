﻿//-------------------------------------------------------------------------------------
//  Copyright (c) 2016 - Microsoft Corporation.
//    detailsRecord.ts - control to view records one at a time, and to select the values.
//-------------------------------------------------------------------------------------

/// <reference path="../_references.ts" />

module beachPartyApp
{
    export class DetailsRecordClass extends BaseAppControlClass
    {
        private application: AppClass;

        _recordText: HTMLElement;
        _listElem: HTMLElement;
        _buttonsElem: HTMLElement;

        _data: any[];                   // the set of records being displayed (selection set)
        _selectionIndex: number;        // index of current record in _data
        _primaryKey: number;           // primary key of current record
        _selectedColName = "";
        _selectedValue = "";
        _sortColumns = true;
        _colInfos: bps.ColInfo[] = null;
        _rowElemByColName: any = {};
        _panel: JsonPanelClass;
        _selectedColIndex = null;
        _numSpreader: NumSpreaderClass;
        _lastPercent = {};
        //_rebuildTimer = null;
        _isFirstRecordLayout = true;
        _recordLayoutCount = 0;

        constructor(application: AppClass, panel: JsonPanelClass)
        {
            super();

            this.application = application;

            this._panel = panel;
            var root = document.createElement("div");
            this._root = root;

            vp.select(root)
                .addClass("recordView")
                .css("background", "black")         // to catch all mouse events for setting focus
                .attr("tabIndex", 0)                // allow it to accept focus
                .attach("keydown", (e) => this.onKeyDown(e))

            this._selectionIndex = 0;
            this._primaryKey = -1;

            //---- add control bar at top ----
            var rootW = vp.select(root);

            this.buildNavPanel(rootW);

            var maxPanelHeight = this.application.maxPanelHeight;
            var maxListHeight = maxPanelHeight - 96;       // for controls above list

            //---- LIST of field/value/search (as table) ----
            var listW = rootW.append("div").append("table")
                .addClass("rvList")
                .attr("cellSpacing", "0")
                .css("max-height", maxListHeight + "px")
                .css("overflow-y", "auto")
                .css("overflow-x", "hidden")
                .css("padding-right", "20px")         // vertical scrollbar doesn't seem to be included in HTML layout here, so add space for it
                .css("padding-bottom", "5px")           // more HTML wierdness - vertical scrollbar shows up when not needed
                //.css("background", "green")         // to catch all mouse events for setting focus
                .attach("mousedown", (e) =>
                {
                    //---- pass focus to our root, so keyboard thru records works correctly ----
                    setTimeout((e) => this._root.focus(), 100);
                });

            this._listElem = listW[0];

            //rootW.css("margin-bottom", "-20px");     // reduce spacing at bottom

            //this.rebuildColTable();
        }

        buildNavPanel(rootW: vp.dom.IWrapperOuter)
        {
            var barW = rootW.append("div")
                .addClass("rvControlBar")
                .css("position", "relative")
                //.css("top", "-10px")

            //---- use a table to support text-align correctly ----
            var tableW = barW.append("table")
                .css("width", "100%")

            var rowW = tableW.append("tr")

            //---- RECORD TEXT ----
            var recordTextW = rowW.append("td").append("div")
                .addClass("rvRecordText")

            //---- BUTTONS----
            var buttonsW = rowW.append("td")
                .css("text-align", "right")

            //---- LEFT button ----
            buttonsW.append("img")
                .addClass("rvImgButton")
                .css("position", "relative")
                //.css("margin-left", "30px")
                //.css("top", "10px")
                .attr("src", "images/prev.png")
                .title("View the next record")
                .attach("click", (e) => this.goto(this._selectionIndex - 1))

            //---- RIGHT button ----
            buttonsW.append("img")
                .addClass("rvImgButton")
                .css("position", "relative")
                .css("mnargin-left", "30px")
                //.css("top", "8px")
                .attr("src", "images/next.png")
                .title("View the previous record")
                .attach("click", (e) => this.goto(this._selectionIndex + 1))

            this._recordText = recordTextW[0];
            this._buttonsElem = buttonsW[0];
        }

        getRecordIndex(ssIndex: number)
        {
            var recordIndex = -1;

            if (this._data && ssIndex >= 0 && ssIndex < this._data.length)
            {
                var record = this._data[ssIndex];
                recordIndex = +record["_primaryKey"];
            }

            return recordIndex;
        }

        goto(value: number)
        {
            var count = (this._data) ? this._data.length : 0;

            value = Math.max(0, value);
            value = Math.min(count - 1, value);

            this._selectionIndex = value;
            this._primaryKey = this.getRecordIndex(value);

            this.rebuildRecordValues();
        }

        selectedColName(value?: string)
        {
            if (arguments.length == 0)
            {
                return this._selectedColName;
            }

            this._selectedColName = value;
            this.onDataChanged("selectedColName");
        }

        onKeyDown(e)
        {
            if (e.keyCode == vp.events.keyCodes.pageDown)
            {
                this.goto(this._selectionIndex + 1);
                vp.events.cancelEventBubble(e);
            }
            else if (e.keyCode == vp.events.keyCodes.pageUp)
            {
                this.goto(this._selectionIndex - 1);
                vp.events.cancelEventBubble(e);
            }
            else if (e.keyCode == vp.events.keyCodes.home)
            {
                this.goto(0);
                vp.events.cancelEventBubble(e);
            }
            else if (e.keyCode == vp.events.keyCodes.end)
            {
                var count = (this._data) ? this._data.length : 0;
                this.goto(count);
                vp.events.cancelEventBubble(e);
            }
        }

        getRootElem()
        {
            return this._root;
        }

        close()
        {
            vp.select(this._root)
                .remove()
        }

        getSelectedIndex(ri: number)
        {
            var ssIndex = -1;

            if (this._data)
            {
                for (var i = 0; i < this._data.length; i++)
                {
                    var record = this._data[i];
                    var riValue = record["_primaryKey"];
                    if (riValue == ri)
                    {
                        ssIndex = i;
                        break;
                    }
                }
            }

            return ssIndex;
        }

        /** this is called from jsonPanel holding this control, when app.selectedRecords changes. */
        selectedRecords(value?: any[])
        {
            if (arguments.length == 0)
            {
                return this._data;
            }

            this._data = value;

            //---- try to maintain the current record (based on _primaryKey column value) ----
            this._selectionIndex = this.getSelectedIndex(this._primaryKey);
            if (this._selectionIndex == -1)
            {
                this._selectionIndex = 0;
                this._primaryKey = this.getRecordIndex(0);
            }

            var colCount = vp.utils.keys(this._rowElemByColName).length;
            if (colCount > 0)
            {
                this.rebuildRecordValues();
            }
            else
            {
                this.rebuildColTable();
            }

            this.onDataChanged("selectedRecords");
        }

        colInfos(value?: bps.ColInfo[])
        {
            if (arguments.length == 0)
            {
                return this._colInfos;
            }

            if (this._sortColumns)
            {
                value = value.orderByStr( (ci) => ci.name);
            }

            this._colInfos = value;
            this.rebuildColTable();
            this.onDataChanged("colInfos");
        }

        selectRowAndSearch(e)
        {
            //---- only allow elem with class=rvValue or TD as valid targets for this event ----
            var elem = e.target;
            if (vp.select(elem).hasClass("rvValue"))
            {
                var valueElem = elem;
                var rowElem = elem.parentElement.parentElement;
            }
            else if (elem instanceof HTMLTableCellElement)
            {
                var valueElem = elem.firstChild;
                var rowElem = elem.parentElement;
            }

            if (valueElem)
            {
                this.selectRowFromParent(rowElem);

                if (valueElem.rawValue !== undefined)
                {
                    //---- for numeric values, use the raw (unformatted) value ----
                    this._selectedValue = valueElem.rawValue;
                }
                else
                {
                    this._selectedValue = vp.select(valueElem).text();
                }
                //this.onDataChanged("selectedValue");

                /*appClass.instance*/this.application.doSearch("Details", this._selectedColName, this._selectedValue, null, bps.TextSearchType.exactMatch);
            }
        }

        selectRowFromParent(elem: any)
        {
            this._selectedColIndex = elem.colIndex;
            this.selectedColName(elem.colName);

            this.rebuildRecordValues();
        }

        getSelectedValue()
        {
            return this._selectedValue;
        }

        rebuildColTable()
        {
            var listW = vp.select(this._listElem)
                .clear()

            this._rowElemByColName = {};

            var data = this._data;
            if (data && data.length)
            {
                if (this._colInfos)
                {
                    var colInfos = this._colInfos;

                    for (var c = 0; c < colInfos.length; c++)
                    {
                        var ci = colInfos[c];

                        //---- add column ----
                        var colName = ci.name;
                        var tip = ci.desc;

                        if (!colName.startsWith("_"))
                        {
                            //var value = "";

                            var rowW = listW.append("tr")
                                .addClass("recordViewRow")

                            //---- COLNAME td ----
                            var colNameW = rowW.append("td")
                                .addClass("rvColName")
                                .text(colName)
                                .title(tip)
                                .attach("click", (e) => this.selectRowFromParent(e.target.parentElement))

                            //---- VALUE td ----
                            var valueElemW = rowW.append("td")
                                .css("white-space", "nowrap")
                                .attach("click", (e) => this.selectRowAndSearch(e));

                            valueElemW.append("span")
                                .addClass("rvValue")
                                //.text(value)          // text is set in rebuildRecordValues()

                            //---- BING td ----
                            var tdW = rowW.append("td")

                            var bingW = tdW.append("img")
                                .addClass("bingImg")
                                .attach("click", (e) => this.selectRowAndBingSearch(e))
                                .attr("src", "images/bing4.png")
                                .css("display", "none")
                                .css("margin-top", "1px")
                                .title("Search for this value in Bing")

                            rowW[0].colIndex = c;
                            rowW[0].colName = colName;
                            rowW[0].minValue = ci.min;
                            rowW[0].maxValue = ci.max;
                            rowW[0].bingElem = bingW[0];
                            //rowW[0].numSpreadElem = numSpreadW[0];
                            //rowW[0].numSpreadParent = numSpreadParentW[0];
                            rowW[0].valueElem = valueElemW[0];

                            this._rowElemByColName[colName] = rowW[0];
                        }
                    }
                }
            }

            this.rebuildRecordValues();
        }

        openNumSpreader(rowParent, numSpreadParent)
        {
            var bpsHelper = /*appClass.instance*/this.application._bpsHelper;
            var value = rowParent.valueElem.textContent;

            var initialPercent = this._lastPercent[this._selectedColName];
            if (initialPercent === undefined)
            {
                initialPercent = 5;
            }

            this._numSpreader = new NumSpreaderClass(bpsHelper, this._selectedColName, +value,
                rowParent.minValue, rowParent.maxValue, numSpreadParent, initialPercent,
                (colName: string, minValue, maxValue, searchType, percent) =>
                {
                    //this._isSearchFromNumSpreader = true;
                    /*appClass.instance*/this.application.doSearch("Details", colName, minValue, maxValue, searchType);
                    //this._isSearchFromNumSpreader = false;

                    this._lastPercent[this._selectedColName] = percent;
                });
        }

        closeNumSpreader()
        {
            if (this._numSpreader)
            {
                this._numSpreader.close();
                this._numSpreader = null;
            }
        }

        rebuildRecordValues()
        {
            if (true)       // !this._isSearchFromNumSpreader)
            {
                this.closeNumSpreader();
            }

            var recordCount = (this._data) ? this._data.length : 0;
            var index = this._selectionIndex + 1;
            var msg = "Record " + index + " (of " + recordCount + ")";
            var listDisp = "block";

            if (recordCount == 0)
            {
                msg = "<no records selected>";
                listDisp = "none";
            }

            //---- hide left/right buttons if no records are selected ----
            vp.select(this._buttonsElem).css("display", (recordCount == 0) ? "none" : "");

            vp.select(this._recordText)
                .text(msg)

            var listW = vp.select(this._listElem)
                .css("display", listDisp)

            var data = this._data;
            if (data && data.length)
            {
                var ri = this._selectionIndex;
                if (ri >= 0 && ri < data.length && this._colInfos)
                {
                    var record = data[ri];
                    var colInfos = this._colInfos;

                    for (var c = 0; c < colInfos.length; c++)
                    {
                        var ci = colInfos[c];
                        var colName = ci.name;
                        var colType = ci.colType;

                        if (!colName.startsWith("_"))
                        {
                            var value = record[colName];
                            var rowElem = this._rowElemByColName[colName];

                            if (rowElem)
                            {
                                var nameElem = rowElem.childNodes[0];
                                var valueElem = rowElem.childNodes[1].firstChild;
                                //var numSpreadParent = rowElem.childNodes[2];
                                //var numSpreadElem = rowElem.childNodes[3].firstChild;
                                var bingElem = rowElem.childNodes[2].firstChild;

                                if (c == this._selectedColIndex)
                                {
                                    vp.dom.css(rowElem, "background", "#444");
                                    //vp.dom.css(numSpreadElem, "display", "none")    //  (colType == "number") ? "" : "none");

                                    //---- show/hide BING element ----
                                    vp.dom.css(bingElem, "display", (colType == "string") ? "" : "none");

                                    if (colType == "number")
                                    {
                                        this.openNumSpreader(rowElem, rowElem.childNodes[1]);
                                    }
                                }
                                else
                                {
                                    vp.dom.css(rowElem, "background", "none")
                                    //vp.dom.css(numSpreadElem, "display", "none");
                                    vp.dom.css(bingElem, "display", "none");
                                }

                                //---- VALUE td ----
                                vp.select(valueElem)
                                    .addClass("rvValue")
                                    .text(value)
                            }
                        }
                    }

                    var primaryKey = record["_primaryKey"];
                    /*appClass.instance*/this.application._bpsHelper.setHoverItem(primaryKey);
                }
            }

            if (this._isFirstRecordLayout && recordCount > 0 && this._recordLayoutCount > 0)
            {
                this._isFirstRecordLayout = false;

                //---- remove width/height to allow it to size on first record  ----
                vp.select(this._panel.getRootElem(), ".recordView")
                    .css("width", "")
                    .css("height", "")

                vp.select(this._panel.getRootElem(), ".rvList")
                    .css("width", "")
                    .css("height", "")

                //---- lock down this size so panel doesn't resize with each record ----
                this._panel.resizePanelToFitContent();
            }

            this._recordLayoutCount++;
        }

        selectRowAndBingSearch(e)
        {
            var parent = e.target.parentElement.parentElement;
            this.selectRowFromParent(parent);

            var searchTerm = parent.valueElem.textContent;

            if (searchTerm.toLowerCase().startsWith("http://"))
            {
                window.open(searchTerm, "_blank");
            }
            else
            {
                window.open("http://www.bing.com/search?q=" + searchTerm, "_blank");
            }
        }

        onResize(width: number, height: number)
        {
            this.quickLayout();
            //this.markBuildNeeded();
        }

        quickLayout()
        {
            var parent = this._panel.getRootElem();

            var rc = vp.select(parent).getBounds(false);
            var height = (rc.height) ? rc.height : 270;     // window.innerHeight * .8;

            var hh = Math.max(25, height - 100);

            //---- quick layout ----
            vp.select(this._listElem)
                .css("max-height", "")
                .css("height", hh + "px")

            vp.utils.debug("quickLayout: panelHeight=" + height + ", listElem height set=" + hh);
        }

    }

    export function createRecordView(application: AppClass, panel: JsonPanelClass)
    {
        return new DetailsRecordClass(application, panel);
    }
}
