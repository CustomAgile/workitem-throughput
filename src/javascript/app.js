Ext.define("workitem-throughput", {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new Rally.technicalservices.Logger(),
    defaults: { margin: 10 },
    items: [
        {
            xtype: 'container',
            itemId: 'display_box',
            layout: {
                type: 'vbox',
                align: 'stretch'
            },
            items: [
                { xtype: 'rallyleftright', itemId: 'header', height: 40, columnWidth: 0.75 },
                { xtype: 'container', itemId: 'filterContainer' }
            ]
        }
    ],

    integrationHeaders: {
        name: "workitem-throughput"
    },

    config: {
        defaultSettings: {
            throughputMeasure: 'PlanEstimate',
            timeboxGranularity: 'Week',
            numberTimeboxes: 6,
            artifactModels: ['Defect', 'UserStory'],
            allowSettingsOverride: true
        }
    },

    MAX_TIMEBOXES: 26,

    launch: function () {
        this.initializeApp();
    },
    initializeApp: function () {

        this.add({
            xtype: 'container',
            itemId: 'filterContainer'
        });

        if (this.getAllowSettingsOverride()) {

            this.suspendEvents();
            var selectorCt = this.down("#header").getLeft().add({
                xtype: 'container',
                layout: {
                    type: 'hbox'
                },
                itemId: 'header_1',
            });

            var g = selectorCt.add({
                xtype: 'rallycombobox',
                width: 150,
                fieldLabel: 'Timebox Granularity',
                labelAlign: 'left',
                labelPad: 2,
                labelWidth: 60,
                name: 'timeboxGranularity',
                itemId: 'timeboxGranularity',
                editable: false,
                store: Ext.create('Rally.data.custom.Store', {
                    data: this.getGranularityData(),
                    fields: ['name', 'value']
                }),
                allowNoEntry: false,
                displayField: 'name',
                valueField: 'value',
                stateful: true,
                margin: 4,
                stateId: 'granularity-data'
            });

            var n = selectorCt.add({
                xtype: 'rallynumberfield',
                width: 115,
                fieldLabel: '# Timeboxes',
                labelAlign: 'left',
                labelPad: 2,
                labelWidth: 70,
                itemId: 'numberTimeboxes',
                name: 'numberTimeboxes',
                minValue: 1,
                maxValue: this.MAX_TIMEBOXES,
                stateful: true,
                margin: 5,
                stateId: 'number-timeboxes'
            });

            g.on('change', this.updateDisplay, this);
            n.on('change', this.updateDisplay, this);
            this._addHeaderControls();
            this.addExportButton(this);

            this.down("#header").getLeft().setWidth(this.down('#timeboxGranularity').getWidth() + this.down('#numberTimeboxes').getWidth() + this.down('#filterContainer_1').getWidth() + 160);

        } else {
            var blackListFields = ['FlowState'],
                whiteListFields = ['Milestones', 'Tags', 'c_EnterpriseApprovalEA'],
                modelNames = this.getArtifactModels();
            this.down('#header').getLeft().add({
                xtype: 'rallyinlinefiltercontrol',
                context: this.getContext(),
                height: 26,
                align: 'left',
                itemId: 'filterContainer_1',
                inlineFilterButtonConfig: {
                    stateful: true,
                    stateId: this.getContext().getScopedStateId('inline-filter'),
                    context: this.getContext(),
                    modelNames: modelNames,
                    filterChildren: false,
                    inlineFilterPanelConfig: {
                        quickFilterPanelConfig: {
                            defaultFields: ['ArtifactSearch', 'Owner'],
                            addQuickFilterConfig: {
                                blackListFields: blackListFields,
                                whiteListFields: whiteListFields
                            }
                        },
                        advancedFilterPanelConfig: {
                            advancedFilterRowsConfig: {
                                propertyFieldConfig: {
                                    blackListFields: blackListFields,
                                    whiteListFields: whiteListFields
                                }
                            }
                        }
                    },
                    listeners: {
                        inlinefilterchange: this._onFilterChange,
                        inlinefilterready: function (inlineFilterPanel) {
                            this.down('#filterContainer').add(inlineFilterPanel);
                        },
                        scope: this
                    }
                }
            });
            this.addExportButton(this);
        }

        this.updateDisplay();
    },

    _addHeaderControls: function () {
        var blackListFields = ['FlowState'],
            whiteListFields = ['Milestones', 'Tags', 'c_EnterpriseApprovalEA'],
            modelNames = this.getArtifactModels();
        this.down('#header_1').add({
            xtype: 'rallyinlinefiltercontrol',
            context: this.getContext(),
            height: 26,
            align: 'left',
            itemId: 'filterContainer_1',
            inlineFilterButtonConfig: {
                stateful: true,
                stateId: this.getContext().getScopedStateId('inline-filter'),
                context: this.getContext(),
                modelNames: modelNames,
                filterChildren: false,
                inlineFilterPanelConfig: {
                    quickFilterPanelConfig: {
                        defaultFields: ['ArtifactSearch', 'Owner'],
                        addQuickFilterConfig: {
                            blackListFields: blackListFields,
                            whiteListFields: whiteListFields
                        }
                    },
                    advancedFilterPanelConfig: {
                        advancedFilterRowsConfig: {
                            propertyFieldConfig: {
                                blackListFields: blackListFields,
                                whiteListFields: whiteListFields
                            }
                        }
                    }
                },
                listeners: {
                    inlinefilterchange: this._onFilterChange,
                    inlinefilterready: function (inlineFilterPanel) {
                        this.down('#filterContainer').add(inlineFilterPanel);
                    },
                    scope: this
                }
            }
        });
    },

    _onFilterChange: function (inlineFilterButton) {
        this.advancedFilter = inlineFilterButton.getWsapiFilter();
        this.updateDisplay();
    },

    addExportButton: function (ct) {
        ct.down('#header').getRight().add({
            xtype: 'rallybutton',
            iconCls: 'icon-export',
            cls: 'rly-small secondary',
            handler: this._exportBtnClick,
            margin: 5,
            scope: this
        });
    },
    _exportBtnClick: function (button) {
        var menu = Ext.widget({
            xtype: 'rallymenu',
            items: [{
                text: 'Export Chart Data...',
                handler: this._export,
                scope: this
            }, {
                text: 'Export Raw Data...',
                handler: this._exportRawData,
                scope: this
            }]
        });
        menu.showBy(button.getEl());
        if (button.toolTip) {
            button.toolTip.hide();
        }
    },
    updateDisplay: function () {

        if (this.down('rallychart')) {
            this.down('rallychart').destroy();
        }

        if (this.down('#messageBox')) {
            this.down('#messageBox').destroy();
        }

        this.logger.log('updateDisplay', this.getNumTimeboxes(), this.getTimeboxGranularity());

        if (!this.getNumTimeboxes() || !this.getTimeboxGranularity()) {

            this.add({
                xtype: 'container',
                itemId: 'messageBox',
                html: '<div class="no-data-container"><div class="secondary-message">Please select a granularity and # timeboxes to calculate throughput for.</div></div>'
            });
            return;
        }

        this.setLoading(true);

        this.getArtifactFilters().then({
            success: function (filters) {
                console.log(filters);
                this.fetchWsapiArtifactRecords({
                    models: this.getArtifactModels(),
                    limit: Infinity,
                    fetch: this.getArtifactFetch(),
                    filters
                }).then({
                    success: function (records) {
                        this.buildChart(records);
                    },
                    failure: this.showErrorNotification,
                    scope: this
                }).always(function () { this.setLoading(false); }, this)
            },
            failure: this.showErrorNotification,
            scope: this
        });

    },
    _export: function () {
        var chart = this.down('rallychart');
        if (!chart) {
            this.showErrorNotification("No chart data to export.");
            return;
        }
        var data = chart && chart.getChartData();
        this.logger.log('_export', data);

        var timebox = this.getTimeboxGranularity(),
            workitems = _.pluck(data.series, 'name');

        var csv = [];
        var headers = [timebox].concat(workitems).concat(this.getThroughputMeasure() + ' - Total');

        csv.push(headers.join(',')); //add headers
        for (var i = 0; i < data.categories.length; i++) {
            row = [data.categories[i]];
            var total = 0;
            for (var j = 0; j < data.series.length; j++) {
                total += data.series[j].data[i];
                row.push(data.series[j].data[i]);
            }
            row.push(total);
            csv.push(row.join(','));
        }

        csv = csv.join('\r\n');
        this.logger.log('export ' + csv);
        var fileName = Ext.String.format("workitem-throughput-{0}.csv", Rally.util.DateTime.format(new Date(), 'Y-m-d-h-i-s'));
        CATS.workitemThroughput.utils.Toolbox.saveAs(csv, fileName);
    },
    _exportRawData: function () {
        if (this.userStories && this.defects) {
            let chart = this.down('rallychart');
            let numTimeboxes = this.getNumTimeboxes();
            let timebox = this.getTimeboxGranularity();
            let re = new RegExp(',' + '|\"|\r|\n', 'g');
            let reHTML = new RegExp('<\/?[^>]+>', 'g');
            let reNbsp = new RegExp('&nbsp;', 'ig');
            let chartData = chart && chart.getChartData();
            let data = RallyTechServices.workItemThroughput.utils.FlowCalculator.getRawBucketData(timebox, numTimeboxes, this.userStories.concat(this.defects), this.getThroughputMeasure(), 'AcceptedDate', null, this.timeboxRecords);

            var csv = [];
            var headers = [timebox, 'Type', 'ID', 'Name', 'Project', 'Release', 'Iteration', this.getThroughputMeasure()];
            csv.push(headers.join(',')); //add headers 

            for (let i = 0; i < chartData.categories.length; i++) {
                let projects = Object.keys(data[i]);
                for (let p of projects) {
                    for (let j = 0; j < data[i][p].length; j++) {
                        row = [chartData.categories[i]];
                        let record = data[i][p][j];
                        let name = record.name.replace(/,/g, '');

                        if (reHTML.test(name)) {
                            name = name.replace('<br>', '\r\n');
                            name = Ext.util.Format.htmlDecode(name);
                            name = Ext.util.Format.stripTags(name);
                        }
                        if (reNbsp.test(name)) {
                            name = name.replace(reNbsp, ' ');
                        }
                        if (re.test(name)) {
                            name = name.replace(/\"/g, '\"\"');
                            name = Ext.String.format("\"{0}\"", name);
                        }

                        row.push(record.type);
                        row.push(record.id);
                        row.push(name);
                        row.push(p);
                        row.push(record.release);
                        row.push(record.iteration);
                        row.push(record.val);
                        csv.push(row.join(','));
                    }
                }
            }
            csv = csv.join('\r\n');
            var fileName = Ext.String.format("workitem-throughput-{0}.csv", Rally.util.DateTime.format(new Date(), 'Y-m-d-h-i-s'));
            CATS.workitemThroughput.utils.Toolbox.saveAs(csv, fileName);
        }
    },
    getNumTimeboxes: function () {
        if (this.getAllowSettingsOverride()) {
            return this.down('#numberTimeboxes') &&
                this.down('#numberTimeboxes').getValue() || null;
        }
        return this.getSetting('numberTimeboxes');
    },
    getAllowSettingsOverride: function () {
        return this.getSetting('allowSettingsOverride');
    },
    getTimeboxGranularity: function () {
        if (this.getAllowSettingsOverride()) {
            return this.down('#timeboxGranularity') &&
                this.down('#timeboxGranularity').getValue() || null;
        }
        return this.getSetting('timeboxGranularity');
    },

    buildChart: function (records) {
        var numTimeboxes = this.getNumTimeboxes(),
            timeboxGranularity = this.getTimeboxGranularity();

        this.logger.log('buildChart: record count, numTimeboxes, TimeboxGranularity', records.length, numTimeboxes, timeboxGranularity);
        this.userStories = Ext.Array.filter(records, function (r) { return r.get('_type') === 'hierarchicalrequirement'; });
        var userStoryData = RallyTechServices.workItemThroughput.utils.FlowCalculator.getBucketData(timeboxGranularity, numTimeboxes, this.userStories, this.getThroughputMeasure(), 'AcceptedDate', null, this.timeboxRecords);

        this.defects = Ext.Array.filter(records, function (r) { return r.get('_type') === 'defect'; });
        var defectData = RallyTechServices.workItemThroughput.utils.FlowCalculator.getBucketData(timeboxGranularity, numTimeboxes, this.defects, this.getThroughputMeasure(), 'AcceptedDate', null, this.timeboxRecords);

        var series = [{
            name: 'User Story',
            data: userStoryData
        }, {
            name: 'Defect',
            data: defectData
        }];

        var categories = RallyTechServices.workItemThroughput.utils.FlowCalculator.getFormattedBuckets(timeboxGranularity, numTimeboxes, null, this.timeboxRecords);


        if (this.down('rallychart')) {
            this.down('rallychart').destroy();
        }

        this.add({
            xtype: 'rallychart',
            chartColors: ['#21A2E0', '#f9a814'],
            context: this.getContext(),
            chartConfig: this.getChartConfig(),
            loadMask: false,
            chartData: {
                series: series,
                categories: categories
            }
        });
    },

    getChartConfig: function () {
        return {
            chart: {
                type: 'column'
            },
            title: {
                text: this.getChartTitle(),
                style: {
                    color: '#666',
                    fontSize: '18px',
                    fontFamily: 'ProximaNova',
                    textTransform: 'uppercase',
                    fill: '#666'
                }
            },
            subtitle: {
                text: this.getSubtitle()
            },

            xAxis: {
                title: {
                    text: null,
                    style: {
                        color: '#444',
                        fontFamily: 'ProximaNova',
                        textTransform: 'uppercase',
                        fill: '#444'
                    }
                },
                labels: {
                    style: {
                        color: '#444',
                        fontFamily: 'ProximaNova',
                        fill: '#444'
                    }
                }
            },
            yAxis: {
                min: 0,
                title: {
                    text: this.getSubtitle(),
                    style: {
                        color: '#444',
                        fontFamily: 'ProximaNova',
                        textTransform: 'uppercase',
                        fill: '#444'
                    }
                },
                labels: {
                    overflow: 'justify',
                    style: {
                        color: '#444',
                        fontFamily: 'ProximaNova',
                        fill: '#444'
                    }
                }
            },
            tooltip: {
                valueSuffix: this.getValueSuffix(),
                backgroundColor: '#444',
                useHTML: true,
                borderColor: '#444',
                style: {
                    color: '#FFF',
                    fontFamily: 'ProximaNova',
                    fill: '#444'
                }
            },
            plotOptions: {
                column: {
                    stacking: 'normal'
                }
            },
            legend: {
                itemStyle: {
                    color: '#444',
                    fontFamily: 'ProximaNova',
                    textTransform: 'uppercase'
                },
                borderWidth: 0
            }
        };
    },
    getValueSuffix: function () {
        var throughputMeasure = Ext.Array.filter(this.getThroughputMeasureData(), function (g) { return g.value === this.getThroughputMeasure(); }, this);

        if (!throughputMeasure || throughputMeasure.length === 0) {
            return " Work Items";
        }
        return throughputMeasure[0].suffix;

    },
    getSubtitle: function () {
        var throughputMeasure = Ext.Array.filter(this.getThroughputMeasureData(), function (g) { return g.value === this.getThroughputMeasure(); }, this);

        if (!throughputMeasure || throughputMeasure.length === 0) {
            return "Count of Work Items";
        }
        return Ext.String.format("Sum of {0}", throughputMeasure[0] && throughputMeasure[0].name);
    },
    getChartTitle: function () {
        var timebox = Ext.Array.filter(this.getGranularityData(), function (g) { return g.value === this.getTimeboxGranularity(); }, this);

        return Ext.String.format("{0} Throughput", timebox[0] && timebox[0].name);
    },
    showErrorNotification: function (msg) {
        Rally.ui.notify.Notifier.showError({
            message: msg,
            allowHTML: true
        });
    },
    getArtifactModels: function () {
        return this.getSetting('artifactModels');
    },
    getArtifactFetch: function () {
        return ['ObjectID', 'AcceptedDate', 'DirectChildrenCount', 'Release', 'ReleaseStartDate', 'Iteration', 'StartDate', 'Project', 'Name', 'FormattedID', this.getThroughputMeasure()];
    },
    getArtifactFilters: function () {
        var deferred = Ext.create('Deft.Deferred');
        var numTimeboxes = this.getNumTimeboxes();
        var timeboxGranularity = this.getTimeboxGranularity();

        if (this._showByReleaseOrIteration()) {
            this._getTimeboxRecords(timeboxGranularity, numTimeboxes).then({
                success: function (records) {
                    if (records && records.length) {
                        this.timeboxRecords = records;

                        let filter = Ext.create('Rally.data.wsapi.Filter', {
                            property: 'ScheduleState',
                            operator: '>=',
                            value: 'Accepted'
                        });

                        let timeboxFilters = [];
                        let startDateText = timeboxGranularity === 'Release' ? 'ReleaseStartDate' : 'StartDate';
                        let endDateText = timeboxGranularity === 'Release' ? 'ReleaseDate' : 'EndDate';

                        for (let r of records) {
                            let currentTimeboxFilter = Ext.create('Rally.data.wsapi.Filter', {
                                property: timeboxGranularity + '.Name',
                                operator: '=',
                                value: r.get('Name')
                            });

                            currentTimeboxFilter = currentTimeboxFilter.and(Ext.create('Rally.data.wsapi.Filter', {
                                property: timeboxGranularity + '.' + startDateText,
                                operator: '=',
                                value: r.get(startDateText)
                            }));

                            currentTimeboxFilter = currentTimeboxFilter.and(Ext.create('Rally.data.wsapi.Filter', {
                                property: timeboxGranularity + '.' + endDateText,
                                operator: '=',
                                value: r.get(endDateText)
                            }));

                            timeboxFilters.push(currentTimeboxFilter);
                        }

                        filter = filter.and(Rally.data.wsapi.Filter.or(timeboxFilters));

                        if (this.advancedFilter) {
                            filter = filter.and(this.advancedFilter);
                        }

                        deferred.resolve(filter);
                    }
                    else {
                        deferred.reject('Error fetching timebox records: ' + operation.error && operation.error.errors.join('<br/>'));
                    }
                },
                failure: function () {
                    console.log("response", error);
                    deferred.reject('Error fetching timebox records: ' + operation.error && operation.error.errors.join('<br/>'));
                },
                scope: this
            });
        }
        else {
            let startDate = RallyTechServices.workItemThroughput.utils.FlowCalculator.getStartDateBoundary(timeboxGranularity, numTimeboxes);
            let filter = Ext.create('Rally.data.wsapi.Filter', {
                property: 'AcceptedDate',
                operator: '>=',
                value: Rally.util.DateTime.toIsoString(startDate)
            });

            if (this.advancedFilter) {
                filter = filter.and(this.advancedFilter);
            }

            deferred.resolve(filter);
        }
        return deferred.promise;
    },
    _showByReleaseOrIteration: function () {
        let granularity = this.getTimeboxGranularity();
        return granularity === 'Iteration' || granularity === 'Release';
    },
    getThroughputMeasure: function () {
        return this.getSetting('throughputMeasure');
    },
    fetchWsapiArtifactRecords: function (config) {
        var deferred = Ext.create('Deft.Deferred');
        //console.log("configurations", config);
        if (!config.limit) { config.limit = "Infinity"; }
        if (!config.pageSize) { config.pageSize = 2000; }
        Ext.create('Rally.data.wsapi.artifact.Store', config).load({
            callback: function (records, operation) {
                if (operation.wasSuccessful()) {
                    deferred.resolve(records);
                } else {
                    deferred.reject('Error fetching artifact records: ' + operation.error && operation.error.errors.join('<br/>'));
                }
            }
        });

        return deferred.promise;
    },
    getThroughputMeasureData: function () {
        //summable fields on the Schedulable Artifact
        return [{
            name: 'Plan Estimate',
            value: 'PlanEstimate',
            suffix: ' Points'
        }, {
            name: 'Task Actual Total',
            value: 'TaskActualTotal',
            suffix: ' Hours'
        }, {
            name: 'Task Estimate Total',
            value: 'TaskEstimateTotal',
            suffix: ' Hours'
        }];
    },
    getGranularityData: function () {
        return [{
            name: 'Weekly',
            value: 'Week'
        }, {
            name: 'Monthly',
            value: 'Month'
        }, {
            name: 'Quarterly',
            value: 'Quarter'
        }, {
            name: 'Release',
            value: 'Release'
        }, {
            name: 'Iteration',
            value: 'Iteration'
        }];
    },
    getSettingsFields: function () {

        return [{
            xtype: 'rallycombobox',
            fieldLabel: 'Throughput Measure',
            labelAlign: 'right',
            labelWidth: 200,
            name: 'throughputMeasure',
            store: Ext.create('Rally.data.custom.Store', {
                data: this.getThroughputMeasureData(),
                fields: ['name', 'value']
            }),
            allowNoEntry: true,
            noEntryText: 'Count',
            displayField: 'name',
            valueField: 'value'
        }, {
            xtype: 'rallycheckboxfield',
            fieldLabel: 'Allow settings change by users',
            labelAlign: 'right',
            labelWidth: 200,
            name: 'allowSettingsOverride'
        }, {
            xtype: 'rallycombobox',
            fieldLabel: 'Timebox Granularity',
            labelAlign: 'right',
            labelWidth: 200,
            name: 'timeboxGranularity',
            store: Ext.create('Rally.data.custom.Store', {
                data: this.getGranularityData(),
                fields: ['name', 'value']
            }),
            allowNoEntry: false,
            displayField: 'name',
            valueField: 'value'
        }, {
            xtype: 'rallynumberfield',
            fieldLabel: '# Timeboxes',
            labelAlign: 'right',
            labelWidth: 200,
            name: 'numberTimeboxes',
            minValue: 1,
            maxValue: this.MAX_TIMEBOXES
        }];

    },
    getOptions: function () {
        return [
            {
                text: 'About...',
                handler: this._launchInfo,
                scope: this
            }
        ];
    },

    _launchInfo: function () {
        if (this.about_dialog) { this.about_dialog.destroy(); }
        this.about_dialog = Ext.create('Rally.technicalservices.InfoLink', {});
    },

    isExternal: function () {
        return typeof (this.getAppId()) == 'undefined';
    },

    _getTimeboxRecords: function (timebox, count) {
        var deferred = Ext.create('Deft.Deferred');
        var context = this.getContext().getDataContext();
        var isRelease = timebox === 'Release';
        var fetch = isRelease ? ['ReleaseStartDate', 'ReleaseDate', 'Name'] : ['StartDate', 'EndDate', 'Name'];

        context.projectScopeDown = false;
        context.projectScopeUp = false;

        var filter = Ext.create('Rally.data.wsapi.Filter', {
            property: isRelease ? 'ReleaseDate' : 'EndDate',
            operator: '<=',
            value: new Date()
        });

        Ext.create('Rally.data.wsapi.Store', {
            model: timebox,
            fetch,
            filters: filter,
            sorters: [{ property: isRelease ? 'ReleaseDate' : 'EndDate', direction: 'DESC' }],
            limit: count,
            pageSize: count,
            context
        }).load({
            callback: function (records, operation) {
                if (operation.wasSuccessful()) {
                    records = records.reverse();
                    deferred.resolve(records);
                } else {
                    deferred.reject('Error fetching artifact records: ' + operation.error && operation.error.errors.join('<br/>'));
                }
            }
        });
        return deferred.promise;
    }
});
