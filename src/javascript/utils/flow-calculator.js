Ext.define('RallyTechServices.workItemThroughput.utils.FlowCalculator', {
    singleton: true,

    dateMapping: {
        Week: {
            dateFormat: 'w',
            dateUnit: 'Week',
            unitMultiplier: 1,
            dateFormat: 'Y-m-d'
        },
        Month: {
            dateFormat: 'm',
            dateUnit: 'Month',
            unitMultiplier: 1,
            dateFormat: 'M-y'
        },
        Quarter: {
            dateFormat: 'm',
            dateUnit: 'Month',
            unitMultiplier: 3,
            dateFormat: 'M-y'
        },
        Release: {
            dateUnit: 'Date',
            unitMultiplier: 1,
            dateFormat: 'Y-m-d'
        },
        Iteration: {
            dateUnit: 'Date',
            unitMultiplier: 1,
            dateFormat: 'Y-m-d'
        },
    },

    getFormattedBuckets: function (incrementType, numberOfIncrements, endDate, timeboxRecords) {
        if (this._isReleaseOrIteration(incrementType)) {
            return _.map(timeboxRecords, function (r) {
                return r.get('Name');
            });
        }
        else {
            var buckets = this.getBuckets(incrementType, numberOfIncrements, endDate, timeboxRecords);

            var dateMapping = this.dateMapping[incrementType];
            if (!dateMapping || !buckets || buckets.length === 0) {
                return [];
            }

            return _.map(buckets, function (b) { return Rally.util.DateTime.format(b.start, dateMapping.dateFormat); });
        }
    },

    getBuckets: function (incrementType, numberOfIncrements, endDate, timeboxRecords) {
        var buckets = [];
        if (this._isReleaseOrIteration(incrementType)) {
            for (let r of timeboxRecords) {
                buckets.push({
                    start: incrementType === 'Release' ? r.get('ReleaseStartDate') : r.get('StartDate'),
                    end: incrementType === 'Release' ? r.get('ReleaseDate') : r.get('EndDate'),
                    name: r.get('Name')
                });
            }
        }
        else {
            var bucketDate = this.getStartDateBoundary(incrementType, numberOfIncrements, endDate);
            if (!bucketDate) {
                return [];
            }

            var unitMultiplier = this.dateMapping[incrementType].unitMultiplier,
                unit = this.dateMapping[incrementType].dateUnit.toLowerCase();


            var i = 0;
            var startDate = bucketDate;
            while (i < numberOfIncrements) {
                i++;
                var endDate = Rally.util.DateTime.add(bucketDate, unit, i * unitMultiplier);
                buckets.push({ start: startDate, end: endDate });
                startDate = endDate;
            }
        }
        return buckets;
    },

    getBucketData: function (timeboxGranularity, numTimeboxes, records, field, dateField, endDate, timeboxRecords) {
        let isReleaseOrIteration = this._isReleaseOrIteration(timeboxGranularity);
        let buckets = this.getBuckets(timeboxGranularity, numTimeboxes, endDate, timeboxRecords);
        let bucketData = _.map(buckets, function (b) { return 0; });

        for (let i = 0; i < records.length; i++) {
            let x = 1;
            let bucketIdentity = isReleaseOrIteration ? records[i].get(timeboxGranularity).Name : records[i].get(dateField);
            let hasChildren = records[i].get('DirectChildrenCount') || 0;

            if (field && field !== 'count') {
                x = records[i].get(field) || 0;
            }

            if (hasChildren === 0) {
                for (let j = 0; j < buckets.length; j++) {
                    if ((isReleaseOrIteration && bucketIdentity === buckets[j].name) || (!isReleaseOrIteration && bucketIdentity >= buckets[j].start && bucketIdentity < buckets[j].end)) {
                        bucketData[j] += x;
                        j = buckets.length;
                    }
                }
            }
        }
        return bucketData;
    },


    getRawBucketData: function (timeboxGranularity, numTimeboxes, records, field, dateField, endDate, timeboxRecords) {
        let isReleaseOrIteration = this._isReleaseOrIteration(timeboxGranularity);
        let buckets = this.getBuckets(timeboxGranularity, numTimeboxes, endDate, timeboxRecords);
        let bucketData = _.map(buckets, function (b) { return {}; });

        for (let i = 0; i < records.length; i++) {
            let x = 1;
            let bucketIdentity = isReleaseOrIteration ? records[i].get(timeboxGranularity).Name : records[i].get(dateField);
            let hasChildren = records[i].get('DirectChildrenCount') || 0;
            let proj = records[i].get('Project').Name;
            let id = records[i].get('FormattedID');
            let name = records[i].get('Name');
            let type = records[i].get('_type');
            let iteration = records[i].get('Iteration') && records[i].get('Iteration').Name || '';
            let release = records[i].get('Release') && records[i].get('Release').Name || '';

            if (field && field !== 'count') {
                x = records[i].get(field) || 0;
            }

            if (hasChildren === 0) {
                for (let j = 0; j < buckets.length; j++) {
                    if ((isReleaseOrIteration && bucketIdentity === buckets[j].name) || (!isReleaseOrIteration && bucketIdentity >= buckets[j].start && bucketIdentity < buckets[j].end)) {
                        if (!bucketData[j][proj]) {
                            bucketData[j][proj] = [];
                        }
                        bucketData[j][proj].push({ id, name, val: x, type, iteration, release });
                        j = buckets.length;
                    }
                }
            }
        }

        return bucketData;
    },

    getStartDateBoundary: function (incrementType, numberOfIncrements, endDate, timeboxRecords) {
        if (this._isReleaseOrIteration(incrementType)) {
            let firstRecord = timeboxRecords[timeboxRecords.length - 1];
            return incrementType === 'Release' ? firstRecord.get('ReleaseStartDate') : firstRecord.get('StartDate');
        }
        else {
            var dateMapping = RallyTechServices.workItemThroughput.utils.FlowCalculator.dateMapping;

            if ((numberOfIncrements < 1) || (!dateMapping[incrementType])) { return null; }

            var currentDate = endDate || new Date(),
                dateUnit = dateMapping[incrementType].dateUnit.toLowerCase(),
                incrementQuantity = numberOfIncrements * dateMapping[incrementType].unitMultiplier,
                startDate = Rally.util.DateTime.add(currentDate, dateUnit, -incrementQuantity);

            return this.getBeginningOfIncrement(startDate, incrementType);
        }
    },
    getBeginningOfIncrement: function (date, incrementType) {

        var shiftedDate = new Date(date);
        shiftedDate.setHours(0);
        shiftedDate.setMinutes(0);
        shiftedDate.setSeconds(0);

        if (incrementType === 'Week') {
            var day = shiftedDate.getDay();
            if (day === 0) { //Sunday
                return shiftedDate;
            }

            shiftedDate = Rally.util.DateTime.add(shiftedDate, "day", -day);
            return shiftedDate;
        }

        shiftedDate.setDate(1);  //if we are here, increment type is either month or quarter.  either way, we want the day set to the first of hte month.

        if (incrementType === 'Month') {
            return new Date(shiftedDate.getFullYear(), shiftedDate.getMonth(), 1);
        }

        if (incrementType === 'Quarter') {
            var month = shiftedDate.getMonth(),
                quarterStart = Math.floor(month / 3) * 3;  //0-based month

            shiftedDate.setMonth(quarterStart);
            return shiftedDate;
        }
        return null;
    },
    shiftDateToMonday: function (check_date) {
        var day = check_date.getDay();

        var delta = 0;

        if (day === 0) {
            // it's Sunday
            delta = 1;
        }
        if (day === 6) {
            delta = 2;
        }

        var shifted_date = check_date;
        if (delta > 0) {
            shifted_date = new Date(check_date.setHours(0));
            shifted_date = Rally.util.DateTime.add(shifted_date, "day", delta);
        }
        return shifted_date;
    },
    _isReleaseOrIteration: function (incrementType) {
        return incrementType === 'Release' || incrementType === 'Iteration';
    }
});