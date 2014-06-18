define(['provoda', './modules/mm2013geo', './modules/cvsloader'], function(provoda, geodata, cvsloader) {
"use strict";




var TimeGraph = function() {};
provoda.HModel.extendTo(TimeGraph, {
	init: function(opts) {
		this._super(opts);

		this.wch(this.map_parent, 'selected_time');
		this.updateState('geodata', geodata);
		cvsloader.on('load', function(cvs_data) {
			this.updateState('cvs_data', cvs_data);
		}, this.getContextOpts());
	}
});

var RunMap = function() {};
provoda.HModel.extendTo(RunMap, {
	init: function(opts) {
		this._super(opts);

		this.wch(this.map_parent.map_parent, 'selected_time');
		this.updateState('geodata', geodata);
		cvsloader.on('load', function(cvs_data) {
			this.updateState('current_runners_data', cvs_data);
			this.updateState('cvs_data', cvs_data);
		}, this.getContextOpts());
	}
});

var GeoMap = function() {};
provoda.HModel.extendTo(GeoMap, {
	init: function(opts) {
		this._super(opts);


		var run_map = new RunMap();
		run_map.init({
			app: this.app,
			map_parent: this
		});
		this.updateNesting('run_map', run_map);
	}
});


var RunnerMapComplex = function() {};
provoda.HModel.extendTo(RunnerMapComplex, {
	init: function(opts){
		this._super(opts);
		this.updateState('geodata', geodata);
		cvsloader.on('load', function(cvs_data) {
			this.updateState('cvs_data', cvs_data);
		}, this.getContextOpts());

		var common_sub_opts = {
			app: this.app,
			map_parent: this
		};
		
		var geo_map = new GeoMap();
		geo_map.init(common_sub_opts);
		this.updateNesting('geo_map', geo_map);

		var time_graph = new TimeGraph();
		time_graph.init(common_sub_opts);
		this.updateNesting('time_graph', time_graph);


		this.setTime(0.2);
		this.wch(this.app, 'current_runner_data');
	},
	setTime: function(factor) {
		this.updateState('selected_time', factor);
	}
});
return RunnerMapComplex;
});