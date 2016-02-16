﻿//-------------------------------------------------------------------------------------
//  Copyright (c) 2015 - Microsoft Corporation.
//    dataLoader.ts - loads data (from server if needed) and return a dataFrame.  Applies wdParams as specified.
//-------------------------------------------------------------------------------------

/// <reference path="../_references.ts" />

module beachParty {
    export class DataLoaderClass {
        private _preloadMgr: PreloadMgrClass;
        private _colsOnDemand;
        private _csvColLoader: CsvColLoaderClass;
        private appMgr: AppMgrClass;

        constructor(preloadMgr: PreloadMgrClass, colsOnDemand: boolean, appMgr: AppMgrClass)       //appMgr: appMgrClass, preloadMgr: preloadMgrClass, isClientEdition: boolean)
        {
            this._preloadMgr = preloadMgr;
            this._colsOnDemand = colsOnDemand;
            this.appMgr = appMgr;
        }

        public expandRecordsByKeywordColumn(data: any, colName: string) {
            if (!vp.utils.isArray(data)) {
                //---- convert DataFrame to JSON, for easier expansion ----
                var df = new DataFrameClass(data);
                data = df.toJson();
            }

            var newData = [];
            var colNames = null;

            for (var i = 0; i < data.length; i++) {
                var record = data[i];

                if (colNames == null) {
                    colNames = vp.utils.keys(record);
                }

                var kwValue = record[colName];
                var keyWords = this.getKeywordsFromCommaString(kwValue);

                //---- generate a record for each keyword ----
                for (var k = 0; k < keyWords.length; k++) {
                    var kw = keyWords[k];

                    if (!isNaN(+kw)) {
                        //---- special treatment for keywords that are numbers so that JavaScript doesn't mess things up ----
                        kw += " ";     //= "__" + kw;
                    }

                    var newRecord: any = {};

                    newRecord._origRecordIndex = i;
                    newRecord._copyIndex = k;
                    newRecord.origKeywordValues = kwValue;

                    //---- transfer all fields from record ----
                    for (var c = 0; c < colNames.length; c++) {
                        var cn = colNames[c];
                        if (cn !== "") {
                            newRecord[cn] = record[cn];
                        }
                    }

                    //---- update the keyword column ----
                    newRecord[colName] = kw;

                    newData.push(newRecord);
                }

            }

            return newData;
        }

        public loadColumns(colMap: any, loadList: string[]) {
            this._csvColLoader.loadColumns(colMap, loadList);
        }

        public getRecord(recordIndex: number, colNames?: string[]) {
            return this._csvColLoader.getRecord(recordIndex, colNames);
        }

        getKeywordsFromCommaString(str: string) {
            var parts = str.split(',');
            var keyWords = [];

            for (var p = 0; p < parts.length; p++) {
                var part = parts[p].trim();     //.toLowerCase();
                if (part !== "") {
                    keyWords.push(part);
                }
            }

            return keyWords;
        }

        public loadDataFrameFromText(text: string, wdParams: bps.WorkingDataParams) {
            var anyData = null;

            if (text.startsWith("[") || text.startsWith("}")) {
                anyData = JSON.parse(text);
            }
            else {
                var separator = wdParams.separator;
                var hasHeader = wdParams.hasHeader;

                if (this._colsOnDemand) {
                    var csvColLoader = new CsvColLoaderClass(text, hasHeader, separator, true, true);
                    this._csvColLoader = csvColLoader;

                    anyData = csvColLoader.buildDataFrameWithEmptyVectors();
                }
                else {
                    anyData = beachParty.csvToJson(text, hasHeader, separator, true);
                }
            }

            return anyData;
        }

        addSysCol(dataFrame: DataFrameClass, name: string, colType: string, desc?: string, vector?: any[]) {
            var colInfo = new bps.ColInfo(name, desc, colType, null);
            dataFrame.addColumn(colInfo, vector);
        }

        addSystemColumns(dataFrame: DataFrameClass, wdParams: bps.WorkingDataParams) {
            this.addSysCol(dataFrame, selectedName, "number", "System column where value=1 means the record is selected");
            this.addSysCol(dataFrame, filteredName, "number", "System column where value=1 means the record is filtered OUT");
            this.addSysCol(dataFrame, randomXName, "number", "System column to provide a random X value for layout");
            this.addSysCol(dataFrame, randomYName, "number", "System column to provide a random Y value for layout");

            //---- does table have a pre-defined primary key? ----
            if (wdParams.primaryKeyCol) {
                var pkName = wdParams.primaryKeyCol;
                var pkVector = dataFrame.getVector(pkName, false);

                //---- create an alias column named "primaryKeyName" that points to the same vector as pkName ----
                this.addSysCol(dataFrame, primaryKeyName, "number", "System column that uniquely defines each record", pkVector);
            }
            else {
                //---- if no primary key specified, use record index ----
                this.addSysCol(dataFrame, primaryKeyName, "number");

                var primaryKeys = dataFrame.getVector(primaryKeyName, false);

                for (var i = 0; i < primaryKeys.length; i++) {
                    primaryKeys[i] = i;
                }
            }

            //---- build randomX, randomY ----
            var randomX = <number[]>dataFrame.getVector(randomXName, false);
            var randomY = <number[]>dataFrame.getVector(randomYName, false);

            for (var i = 0; i < primaryKeys.length; i++) {
                randomX[i] = Math.random();
                randomY[i] = Math.random();
            }

            dataFrame.rebuildPrimaryKeyIndex();
        }

        /** open the specified known data file, async.  if "multiValueCol" is true, replicate records
            so that we have 1 record for each value in the specified column of each original record. */
        public loadKnownAsyncCore(name: string, multiValueCol?: string, callback?: any) {
            //vp.utils.debug("loadKnownAsync: name=" + name);

            var lowName = name.toLowerCase();          // support user typing of name with wrong case

            var preload = this._preloadMgr.getFilePreload(lowName);
            if (!preload) {
                throw "Error: unknown known file: " + lowName;
            }

            //---- ensure this has a dataName set ----
            if (!preload.dataName) {
                preload.dataName = preload.name;
            }

            var anyWindow = <any>window;

            if (lowName == "knowndata") {
                var jsonPreload = this._preloadMgr.getPreloads();
                var result = this.processData(jsonPreload, preload, multiValueCol);

                if (callback) {
                    callback(result.origDf, result.postDf, result.wdParams);
                }
            }
            else {
                this.openPreloadAsyncCore(preload, multiValueCol, callback);
            }
        }

        /** convert "anyData" into a dataFrame, and then apply wdParams. */
        public processData(anyData: any, wdParams?: bps.WorkingDataParams, multiValueCol?: string) {
            //---- did caller request record duplication to expand each keyword to its own record? ----
            if (multiValueCol || wdParams.multiValueCol) {
                anyData = this.expandRecordsByKeywordColumn(anyData, multiValueCol);
            }

            //---- convert data (in 1 of N formats) to a dataFrame object ----
            var df = null;

            if (vp.utils.isString(anyData)) {
                anyData = this.loadDataFrameFromText(anyData, wdParams);
            }

            if (vp.utils.isArray(anyData)) {
                df = DataFrameClass.jsonToDataFrame(anyData);
            }
            else if (anyData instanceof DataFrameClass) {
                df = anyData;
            }
            else {
                df = new DataFrameClass(anyData);
            }

            //---- apply WORKING DATA PARAMS ----
            var origDf = df;

            if (wdParams.fieldList && wdParams.fieldList.length) {
                df = df.makeFields(wdParams.fieldList, wdParams.mergeFieldList);
            }

            if (wdParams.prefilter) {
                df = df.applyPrefilter(wdParams.prefilter);
            }

            df._wdParams = wdParams;

            this.addSystemColumns(df, wdParams);

            return { origDf: origDf, postDf: df, wdParams: wdParams };
        }

        public openPreloadAsyncCore(wdParams: bps.WorkingDataParams, multiValueCol?: string, callback?: any) {
            var path = wdParams.filePath;
            var fileName = (wdParams.dataName) ? wdParams.dataName : path;

            if (wdParams.fileType == bps.FileType.sql) {
                FileAccess.readSqlTable(path, wdParams.tableName, wdParams.queryString, wdParams.maxRecords,
                    (dataFrame) => {
                        var keys = vp.utils.keys(dataFrame);
                        var firstKey = keys[0];
                        var recordCount = dataFrame[firstKey].length;

                        vp.utils.debug("openKnownAsync SUCCEEDED: columns=" + keys.length + ", records=" + recordCount);
                        var result = this.processData(dataFrame, wdParams, multiValueCol);

                        if (callback) {
                            callback(result.origDf, result.postDf, result.wdParams);
                        }
                    },
                    (e) => {
                        utils.onFileOpenError(fileName, e.response);
                    });
            }
            else {
                var separator = wdParams.separator;
                if (!separator) {
                    separator = (path.endsWith(".csv")) ? "," : "\t";
                    wdParams.separator = separator;
                }

                if (this._colsOnDemand) {
                    //---- for consistency (and colsOnDemand feature), just read the plain text and parse the text on the client ----
                    var format = <fileFormat>null;
                    separator = null;
                }
                else {
                    var format = (wdParams && wdParams.fileType == bps.FileType.json) ? fileFormat.json : fileFormat.csv;
                }

                var csvOptions = { hasHeader: wdParams.hasHeader, sepChar: separator, findTypes: true }
                var convertToDataFrameClass = false;            // just return as map of named vectors 

                if (path.startsWith("http://") || path.startsWith("https://")) {
                    fn = path;
                }
                else {
                    var fn = bpDataPath() + "/DataFiles/" + path;
                }

                fn += "?" + Date.now();         // prevent caching


                var tryCache = (!wdParams || wdParams.canLoadFromCache);

                if (tryCache) {
                    var strCacheEntry = beachParty.LocalStorageMgr.get(StorageType.dataFile,
                        StorageSubType.web, path);

                    if (strCacheEntry) {
                        var cacheEntry = JSON.parse(strCacheEntry);

                        var dataFrameOrText = cacheEntry.data;
                        var result = this.processData(dataFrameOrText, wdParams, multiValueCol);

                        if (callback) {
                            callback(result.origDf, result.postDf, result.wdParams);
                        }
                    }
                }

                if (!dataFrameOrText) {
                    //---- not found in cache ----
                    addTrace("serverRequest", path, TraceEventType.start);

                    FileAccess.readFile(fn, format, csvOptions,
                        (dataFrameOrText) => {
                            addTrace("serverResponse", path, TraceEventType.end);

                            if (wdParams.canLoadFromCache && wdParams.fileSource == "url" && this.appMgr.isCacheWebFiles()) {
                                var obj = { data: dataFrameOrText, wdParams: wdParams };
                                var value = JSON.stringify(obj);

                                beachParty.LocalStorageMgr.save(StorageType.dataFile,
                                    StorageSubType.web, path, value);
                            }

                            //vp.utils.debug("loadKnownAsync SUCCEEDED: columns=" + keys.length + ", records=" + recordCount);
                            var result = this.processData(dataFrameOrText, wdParams, multiValueCol);

                            if (callback) {
                                callback(result.origDf, result.postDf, result.wdParams);
                            }
                        },
                        (e) => {
                            utils.onFileOpenError(fileName, e.response);

                        }, false, convertToDataFrameClass);
                }
            }
        }
    }
} 