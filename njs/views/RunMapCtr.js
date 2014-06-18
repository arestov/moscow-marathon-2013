define(['d3', 'provoda', 'spv', 'libs/simplify', 'libs/veon', './modules/colors', './modules/maphelper', 'jquery'],
function(d3, provoda, spv, simplify, veon, colors, mh, $) {
"use strict";

var RunMapCtr = function() {};
provoda.View.extendTo(RunMapCtr, {
	
	createBase: function() {

		var svg = document.createElementNS(mh.SVGNS, 'svg');
		this.c = $(svg).css('display', 'none');

		this.svg = d3.select(svg);

/*
		this.dot = this.svg.append('circle')
			.attr("r", 5)
			.style({
				stroke: 'none',
				"fill": 'red'
			});*/

		this.knodes = {};
		var knodes = this.knodes;

		var main_group = this.svg.append('g');
		knodes.main_group = main_group;



		knodes.base = main_group.append("path");

		knodes.areas_group = main_group.append('g');

		knodes.debug_group = main_group.append('g');




		knodes.bottom_group = this.svg.append('g');
		/*knodes.bottom_path = knodes.bottom_group.append('path').style({
			stroke: '#333',
			"fill": 'none'
		});*/
		knodes.bottom_lines = knodes.bottom_group.append('g');





		knodes.left_group = this.svg.append('g');
		knodes.left_path = knodes.left_group.append('path').style({
			stroke: '#333',
			"fill": 'none'
		});
		knodes.left_lines = knodes.left_group.append('g');


		
		
		this.wch(this, 'vis_con_appended', function(e) {
			if (e.value){
				this.checkSizes();
			}
			this.setVisState('ready', e.value);
			
		});


		this.projection = d3.geo.mercator().scale(1).translate([0, 0]);
		this.root_view.projection = this.projection;

		this.wch(this, 'basedet', function(e) {
			if (e.value){
				this.root_view.promiseStateUpdate('d3map_dets', e.value);
			}
		});


		this.path = d3.geo.path().projection(this.projection);
		this.behavior = d3.behavior.zoom();

		this.behavior.on("zoom", function() {
			if (d3.event) {
				var result = {};
				var t = _this.projection.translate();
				var t1 = t, t2 = d3.event.translate,
					tval = [t2[0]-t1[0], t2[1]-t1[1]];

				result.translate = tval;
				result.scale = d3.event.scale;

				_this.projection
						//.translate(d3.event.translate)
						.scale(d3.event.scale);

				_this.updateManyStates(result);
			}


			//_this.setVisState('map_event', Date.now());
		});
		//this.svg.call(this.behavior);
		var _this = this;

		$(window).on('resize', spv.debounce(function() {
			_this.checkSizes();
		},100));

		this.parent_view.c.append(this.c);
		this.setVisState('con_appended', true);

		this.wch(this, 'trackwidth', function(e) {
			this.parent_view.parent_view.promiseStateUpdate('trackwidth', e.value);
		});
		this.wch(this, 'trackheight', function(e) {
			this.parent_view.parent_view.promiseStateUpdate('trackheight', e.value);
		});
		this.wch(this, 'track_left_padding', function(e) {
			this.parent_view.parent_view.promiseStateUpdate('track_left_padding', e.value);
		});
		this.wch(this, 'track_top_padding', function(e) {
			this.parent_view.parent_view.promiseStateUpdate('track_top_padding', e.value);
		});
		this.wch(this, 'width', function(e) {
			this.parent_view.parent_view.promiseStateUpdate('mapwidth', e.value);

		});
		this.wch(this, 'height', function(e) {
			this.parent_view.parent_view.promiseStateUpdate('mapheight', e.value);
			this.root_view.promiseStateUpdate('maxwdith', e.value * 1.6);
			this.checkSizes();
			this.root_view.promiseStateUpdate('mapheight', e.value);
		});
		
		
		this.wch(this, 'runners_rate', function(e){
			this.root_view.promiseStateUpdate('runners_rate', e.value);
		});
	},
	earth_radius: mh.earth_radius,
	checkSizes: function() {
		var result = {};
		var container = this.c.parent();
		
		if (container[0]){
			result.width = container.width();
		}

		result.height = Math.max(window.innerHeight - 80, 580);
		this.updateManyStates(result);
	},
	updateManyStates: function(obj) {
		var changes_list = [];
		for (var name in obj) {
			changes_list.push(name, obj[name]);
		}
		this._updateProxy(changes_list);
	},


	'compx-time_value': {
		depends_on: ['selected_time', 'cvs_data'],
		fn: function(selected_time, cvs_data) {
			if (cvs_data && typeof selected_time != 'undefined'){
				return cvs_data.run_gap * selected_time;
			}
		}
	},
	'compx-genderpaths': {
		depends_on: ['cvs_data'],
		fn: function(cvs_data) {
			if (!cvs_data){
				return;
			}
			this.knodes.age_areas = {};


			var array = cvs_data.runners_groups.slice().reverse();
			var _this = this;
			array.forEach(function(el) {
				var grad = _this.parent_view.parent_view.gender_grads[el.gender];
				var color = colors.getGradColor(el.num, 1, el.groups_count, grad);
				_this.knodes.age_areas[ el.key ] = (_this.knodes.areas_group.append('path').style({
					stroke: 'none',
					"fill": color
				}));

			});
		}
	},
	'compx-basepath': {
		depends_on: ['geodata'],
		fn: function(geodata) {
			var rad_distance = d3.geo.length(geodata);
			this.total_distance = rad_distance * this.earth_radius;
			this.knodes.base.data([geodata]);
			return true;
		}
	},
	'compx-bd': {
		depends_on: ['height', 'width', 'vis_ready'],
		fn: function(height, width, vis_ready) {
			if (!height || !width || !vis_ready){
				return;
			}
			var container = this.c.parent();
			container.css('height', height);

			this.width = width;
			this.height = height;
			this.c.css('display', '');
			this.svg.attr({
				width: this.width,
				height: this.height
			});
	
				
			return Date.now();
		}
	},
	'compx-basedet': {
		depends_on: ['geodata', 'bd'],
		fn: function(geodata, bd) {
			if (geodata && bd){
				this.projection.scale(1).translate([0, 0]);
				var b = this.path.bounds(geodata),
					s = 0.90 / Math.max((b[1][0] - b[0][0]) / this.width, (b[1][1] - b[0][1]) / this.height),
					t = [(this.width - s * (b[1][0] + b[0][0])) / 2, (this.height - s * (b[1][1] + b[0][1])) / 2];

				this.behavior.translate(t).scale(s);

				this.projection.scale(s).translate(t);

				

			//	var _this = this;

				this.updateManyStates({
					scale: 0,
					translate: [0,0]
				});

				//this.redraw();

				/*var _this = this;
				(function(){

					var input = document.querySelector('input.dot');
					if (!input){
						_this.setDot(geodata, 15985);
						return;
					}
					input.oninput = function(){
						_this.setDot(geodata, input.value * 1);
					};

					_this.setDot(geodata, input.value * 1);

						
				}).call(this);*/

				return  this.path.bounds(geodata);
			}
			
		}
	},
	setDot: function(geodata, distance){
		var pp = mh.getPointAtDistance(geodata.geometry.coordinates, distance);
		var pjr = this.projection(pp.target);

	
		this.dot
			.attr("cy", pjr[1])
			.attr("cx", pjr[0]);
	},
	/*'compx-ddot': {
		depends_on: ['geodata', 'basedet', 'scale'],
		fn: function(geodata, basedet) {
			if (basedet && geodata){
				this.setDot(geodata, 15985);
			}
		}
	},*/
	'compx-basepathch':{
		depends_on: ['basedet', 'basepath', 'scale'],
		fn: function(basedet, basepath){
			if (basedet && basepath){
				this.knodes.base.attr("d", this.path);
				this.knodes.base.projection_key = this.projection.scale() + '_' + this.projection.translate();
				return Date.now();
			}
		}
	},
	'compx-runners_rate':{
		depends_on: ['basepathch', 'cvs_data'],
		fn: function(basepathch, cvs_data){
			if (!basepathch || !cvs_data){
				return;
			}
			return mh.getStepHeight(this.knodes, 735, 300, cvs_data.items, cvs_data.start_time, this.total_distance, 1000);
		}
	},
	'compx-draw': {
		depends_on: ['basepathch', 'cvs_data', 'time_value'],
		fn: function(basepathch, cvs_data, time_value) {
			if (!basepathch || !cvs_data || typeof time_value == 'undefined'){
				return;
			}
			var data = mh.getPoints(cvs_data, this.knodes, time_value, false, cvs_data.start_time, this.total_distance);
			mh.drawRunnersPoints(colors, this.parent_view.parent_view.gender_grads, data, cvs_data, this.knodes, time_value, cvs_data.start_time);
			//console.log();
			//	xAxis.attr("x1", t[0]).attr("x2", t[0]);
			//yAxis.attr("y1", t[1]).attr("y2", t[1]);
			//
			return {};
		}
	},
	'compx-trackbbox': {
		depends_on: ['basepathch'],
		fn: function(basepathch) {
			if (basepathch){
				return this.knodes.base[0][0].getBBox();
			}
		}
	},
	'compx-track_left_padding': {
		depends_on: ['basedet'],
		fn: function(basedet) {
			if (basedet){


				return Math.round(basedet[0][0]);
			}
		}
	},
	'compx-track_top_padding': {
		depends_on: ['basedet'],
		fn: function( basedet) {
			if ( basedet){
				return Math.round(basedet[0][1]);
			}
		}
	},
	'compx-trackwidth': {
		depends_on: ['basedet'],
		fn: function(basedet) {
			if (basedet){

				return Math.round(basedet[1][0] - basedet[0][0]);
			}
		}
	},
	'compx-trackheight': {
		depends_on: ['basedet'],
		fn: function(basedet) {
			if (basedet){

				return Math.round(basedet[1][1] - basedet[0][1]);
			}
		}
	},
	'stch-translate': function(state) {
		var translate_str =  "translate(" + state + ")";
		this.knodes.main_group.attr("transform", translate_str);
		//this.dot.attr("transform", translate_str);
		this.knodes.bottom_group.attr("transform", "translate(" + [state[0], 0] + ")");
		this.knodes.left_group.attr("transform", "translate(" + [0, state[1]] + ")");
		
	},
	'compx-altit':{
		depends_on: ['basepathch', 'cvs_data', 'geodata', 'scale'],
		fn: function(basepathch, cvs_data, geodata) {
			if (!basepathch || !geodata){
				return;
			}



			//var max_alt = 0;
			var min_alt = Infinity;
			var coordinates = geodata.geometry.coordinates;

			coordinates.forEach(function(el, i){
				min_alt = Math.min(min_alt, el[2]);

				if (coordinates[i-1]){
					/*var gp = function(p){
						return {
							lat: p[0],
							lon: p[1]
						};
					};
					var p1 = gp(el);
					var p2 = gp(coordinates[i-1]);*/
					//el[3] = veon.calcDist(p1, p2) + coordinates[i-1][3];
					//el[3] = veon.getPointsDistanceM(el, coordinates[i-1]) + coordinates[i-1][3];
					el[3] = d3.geo.distance(el, coordinates[i-1]) + coordinates[i-1][3];

				} else {
					el[3] = 0;
				}
			});
			
			var _this = this;
			/*
			var getPB = function(el){
				var pjr = _this.projection(el);

				return [
					pjr[0] + ',' + (_this.height - (el[2] - min_alt)),
					(el[2] - min_alt) + ',' + pjr[1]
				];
			};*/



			var getAltVPoints = function(el){
				var pjr = _this.projection(el);
				return [
					{
						x: Math.round(pjr[0]),
						y: Math.round((_this.height - (el[2] - min_alt))),
						z: Math.round(_this.height - pjr[1])
					},
					{
						x: Math.round((el[2] - min_alt)),
						y: Math.round(pjr[1]),
						z: Math.round(pjr[0])
					}
				];
			};

			var getPathPartByRange = function(array, range){
				var result = [];
				array.forEach(function(el){
					var distance = el[3];
					var min = range[0] / _this.earth_radius;
					var max = range[1] / _this.earth_radius;
					if (distance >= min && distance < max){
						result.push(el);
					}
				});
				return result;
			};

			
			

			var formatForPath = function(p){
				return p.x + ',' + p.y;
			};
			var getPathData = function(array){
				var result = '';
				result += 'M' + formatForPath(array[0]);

				array.slice(1).forEach(function(el){
					result += ' L' + formatForPath(el);
				});
				return result;
			};

			var getSortedPointsGroups = function(array){
				var result = [];
				result.max_dist = 0;
				result.min_dist = Infinity;

				//var max_dist = 0;
				for (var i = 1; i < array.length; i++) {
					var obj = {
						start: array[i-1],
						end: array[i]
					};
					var mid_dist = (obj.start.z + obj.end.z)/2;
					result.max_dist = Math.max(result.max_dist, mid_dist);
					result.min_dist = Math.min(result.min_dist, mid_dist);
					obj.mid_dist = mid_dist;
					result.push(obj);
				}
				result.sort(function( a, b ){
					return spv.sortByRules(a,b, [{
						field: ['mid_dist']
					}]);
				});
				result.reverse();

				return result;
			};



			var points_bottom = [];
			var bottom_range = [19900, 42700];
			var bottom_array = getPathPartByRange(coordinates, bottom_range);
			bottom_array.forEach(function(el){
				var point = getAltVPoints(el);
				points_bottom.push(point[0]);

			});
			points_bottom = simplify(points_bottom, 10, true);

			var complects_bo = getSortedPointsGroups(points_bottom);

			var grays = _this.parent_view.parent_view.grays;
			this.knodes.bottom_lines.selectAll('*').remove();
			complects_bo.forEach(function(el){

				_this.knodes.bottom_lines.append('path').style({
					stroke: 'none',
					fill: colors.getGradColor(el.mid_dist, complects_bo.min_dist, complects_bo.max_dist, grays),
					opacity: 0.2
				}).attr('d',
					'M' + el.start.x + ',' + _this.height +
					' L ' + formatForPath(el.start) +
					' L ' + formatForPath(el.end) +
					' L ' + el.end.x +',' + _this.height +
					'Z');

				_this.knodes.bottom_lines.append('line').style({
					stroke: '#888',
					fill: 'none'
				}).attr({
					x1: el.start.x,
					y1: el.start.y,
					x2: el.end.x,
					y2: el.end.y
				});



			});
			//_this.knodes.bottom_path.attr("d", getPathData(points_bottom));



			

			var points_left = [];
			var left_range = [0, 17300];
			var left_array = getPathPartByRange(coordinates, left_range);
			left_array.forEach(function(el){
				var point = getAltVPoints(el);
				points_left.push(point[1]);

			});
			points_left = simplify(points_left, 10, true);

			var complects_left = getSortedPointsGroups(points_left);
			this.knodes.left_lines.selectAll('*').remove();
			complects_left.forEach(function(el){

				_this.knodes.left_lines.append('path').style({
					stroke: 'none',
					fill: colors.getGradColor(el.mid_dist, complects_left.min_dist, complects_left.max_dist, grays),
					opacity: 0.2
				}).attr('d',
					'M' + 0 + ',' + el.start.y +
					' L ' + formatForPath(el.start) +
					' L ' + formatForPath(el.end) +
					' L ' + 0 +',' + el.end.y +
					'Z');

				_this.knodes.left_lines.append('line').style({
					stroke: '#777',
					fill: 'none'
				}).attr({
					x1: el.start.x,
					y1: el.start.y,
					x2: el.end.x,
					y2: el.end.y
				});



			});

			_this.knodes.left_path.attr("d", getPathData(points_left));
		}
	}
});

return RunMapCtr;
});