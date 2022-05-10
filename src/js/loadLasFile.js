var Promise = require('./bluebird'),
    util = require('./util'),
    laslaz = require('./laslaz');

    var loadData = function(lf, buffer, progressCB) {
        return Promise.resolve(lf).cancellable().then(function(lf) {
            return lf.open().then(function() {
                lf.isOpen = true;
                return lf;
            })
            .catch(Promise.CancellationError, function(e) {
                // open message was sent at this point, but then handler was not called
                // because the operation was cancelled, explicitly close the file
                return lf.close().then(function() {
                    throw e;
                });
            });
        }).then(function(lf) {
            console.log("getting header");
            return lf.getHeader().then(function(h) {
                console.log("got header", h);
                return [lf, h];
            });
        }).then(function(v) {
            var lf = v[0];
            var header = v[1];

            var batcher = [];
            // new render.ParticleSystemBatcher(
            //     $("#vertexshader").text(),
            //     $("#fragmentshader").text());

                var skip = 1;//Math.round((10 - currentLoadFidelity()));
                var totalRead = 0;
                var totalToRead = (skip <= 1 ? header.pointsCount : header.pointsCount / skip);
                var reader = function() {
                    var p = lf.readData(1000000, 0, skip);
                    return p.then(function(data) {
                        console.log(header);
                        var Unpacker = lf.getUnpacker();

                        batcher.push(new Unpacker(data.buffer,
                                                  data.count,
                                                  header));

                        totalRead += data.count;
                        progressCB(totalRead / totalToRead);

                        if (data.hasMoreData)
                            return reader();
                        else {

                            header.totalRead = totalRead;
                            header.versionAsString = lf.versionAsString;
                            header.isCompressed = lf.isCompressed;
                            return [lf, header, batcher];
                        }
                    });
                };

                // return the lead reader
                return reader();
        }).then(function(v) {
            var lf = v[0];
            // we're done loading this file
            //
            progressCB(1);

            // Close it
            return lf.close().then(function() {
                lf.isOpen = false;
                // Delay this a bit so that the user sees 100% completion
                //
                return Promise.delay(200).cancellable();
            }).then(function() {
                // trim off the first element (our LASFile which we don't really want to pass to the user)
                //
                return v.slice(1);
            });
        }).catch(Promise.CancellationError, function(e) {
            // If there was a cancellation, make sure the file is closed, if the file is open
            // close and then fail
            if (lf.isOpen)
                return lf.close().then(function() {
                    lf.isOpen = false;
                    console.log("File was closed");
                    throw e;
                });
            throw e;
        });
    };
var getBinaryLocal = function(file) {
    var fr = new FileReader();
    var p = Promise.defer();

    fr.onload = function(e) {
        p.resolve(new laslaz.LASFile(e.target.result));
    };

    fr.readAsArrayBuffer(file);

    return p.promise.cancellable().catch(Promise.CancellationError, function(e) {
        fr.abort();
        throw e;
    });
};

var cancellableLoad = function(fDataLoader, files, name) {
    //  fDataLoader should be a function that when called returns a promise which
    //  can be cancelled, the fDataLoader should resolve to an array buffer of loaded file
    //  and should correctly handle cancel requets.
    //
    var progress = function(pc, msg) {
        console.log("progress: ", pc, msg);
        
        var obj = {
            type: "load.progress",
            percent: Math.round(pc * 100)
        };

        if (msg !== undefined) obj.message = msg;
        
        let event = new CustomEvent('load.progress', {detail:{percent: Math.round(pc * 100), message: msg}});
		document.dispatchEvent(event);
    };

    var loaderPromise = null;
    document.addEventListener("load.cancel", function() {
        if (loaderPromise === null) return;
        var a = loaderPromise;
        loaderPromise = null;

        progress(1, "Cancelling...");
        setTimeout(function() {
            a.cancel();
            console.log('Cancellation done!');
        }, 0);
    });

    let event = new CustomEvent('load.started');
	document.dispatchEvent(event);

    progress(0, "Fetching " + name + "...");

    var currentLoadIndex = 0;
    var maxLoadIndex = files.length;

    var sofar = [];
    var rate = new util.RateCompute();

    var pfuncDataLoad = (function() {
        var lastm = "Fetching " + name + "...";
        var lastsofar = 0;
        return function(p, msg, sofar) {
            if (typeof msg === 'number') {
                sofar = msg;
                msg = null;
            }

            if (msg)
                lastm = msg;

            var count = sofar - lastsofar;
            lastsofar = sofar;

            rate.push(count);

            var m = (lastm ? (lastm + " @ ") : "") + rate.message;
            progress((currentLoadIndex + p*0.5) / maxLoadIndex, m);
        };
    })();

    var pfuncDecompress = function(p, msg) {
        progress((currentLoadIndex + 0.5 + p*0.5) / maxLoadIndex, msg);
    };

    var cur = Promise.resolve().cancellable();

    files.forEach(function(fname) {
        cur = cur.then(function() {
            return fDataLoader(fname, pfuncDataLoad).then(function(lf) {
                console.log(fname.name, 'Done loading file, loading data...',lf);
                return loadData(lf, lf.buffer, pfuncDecompress);
            })
            .then(function(r) {
                // pass through the data, but query if we have any credits for this file
                // return loadCreditsFile(fname).then(function(credits) {
                //     r[1].credits = credits;

                    return r;
                // });
            })
            .then(function(r) {
                console.log(fname.name, 'Done loading data...');
                var ret = {
                    header: r[0],
                    batcher: r[1]
                };

                // TODO: This needs to be fixed for mutliple URLs
                //
                ret.header.name = fname.name || name;
                currentLoadIndex ++;
                sofar.push(ret);
            });
        });
    });

    loaderPromise = cur.then(function() {
        let event = new CustomEvent('load.completed', {detail: {batches: sofar}});
	    document.dispatchEvent(event);
    })
    .catch(Promise.CancellationError, function(e) {
        console.log(e, e.stack);
        let event = new CustomEvent('load.cancelled');
	    document.dispatchEvent(event);
    })
    .catch(function(e) {
        console.log(e, e.stack);

        let event = new CustomEvent('load.failed', {detail:{error: 'Failed to load file'}});
	    document.dispatchEvent(event);
    })
    .finally(function() {
        progress(1);

        loaderPromise = null;
    });
};

export {getBinaryLocal, cancellableLoad};