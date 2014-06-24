define(['provoda', 'jquery', './GeoMapCtr', './TimeGraphCtr', './modules/colors', 'spv', 'd3', './modules/maphelper'],
function(provoda, $, GeoMapCtr, TimeGraphCtr, colors, spv, d3, mh) {
"use strict";

var RunMapCompxCtr = function() {};
provoda.View.extendTo(RunMapCompxCtr, {
	gender_grads: [colors.getRGBGradient(255, ['#FFCBD5', '#EE2046'].map(colors.parseHEXString)), colors.getRGBGradient(255, ['#B8E8FF', '#1D56DF'].map(colors.parseHEXString))],
	grays: colors.getRGBGradient(4, ['#777777', '#EEEEEE'].map(colors.parseHEXString)),
	children_views:{
		geo_map: GeoMapCtr,
		time_graph: TimeGraphCtr
	},
	createDetails: function() {
		this.c = this.root_view.els.runm_c;
		this.createTemplate();
		

		var svg;
		svg = document.createElementNS(mh.SVGNS, 'svg');
		//this.c = $(svg).css('display', 'none');
		$(svg).appendTo(this.tpl.ancs['legendage']);
		
		this.legendage = d3.select(svg);

		svg = document.createElementNS(mh.SVGNS, 'svg');
		$(svg).appendTo(this.tpl.ancs['legendcount']);
		this.legendcount =  d3.select(svg);
		this.createLegendCount();


		var scroll_marker = this.tpl.ancs['scroll_marker'];
		this.marker_width = scroll_marker.width();
		this.half_width = this.marker_width/2;

		var relative_con = this.tpl.ancs['controlls'];

		var _this = this;


		this.setVisState('con_width', relative_con.width());

		var changeTime = function(pos) {
			var factor = pos/_this.state('vis_con_width');
			factor = Math.min(factor, 1);
			factor = Math.max(factor, 0);
			_this.promiseStateUpdate('', factor);
			_this.RPCLegacy('setTime', factor);
		};


		var watchPos = function(e) {
			var pos = e.pageX - _this.con_offset.left;
			changeTime(pos, _this.con_offset);
		};

		
		scroll_marker
			.on('mousedown', function(e) {
				e.preventDefault();
				_this.con_offset = relative_con.offset();
				$(document).on('mousemove', watchPos);
				$(document).on('mouseup', function() {
					$(document).off('mousemove', watchPos);
				});
			});
		this.wch(this.root_view, 'maxwdith', spv.debounce(function() {
			this.con_offset = null;
			this.checkSizes();
		},100));

		this.wch(this.root_view, 'runners_rate', function(e) {
			this.promiseStateUpdate('runners_rate', e.value);
		});


		var mth_text = ['марафон', '42 км 195 м'];
		this.tpl.ancs['mthswitch']
			.on('mouseenter', function() {
				$(this).text(mth_text[1]);
			})
			.on('mouseleave', function() {
				$(this).text(mth_text[0]);
			});


		this.wch(this.root_view, 'd3map_dets', function(e) {
			this.promiseStateUpdate('d3map_dets', e.value);
		});


		var mpd = {};
		this.mapcover_data = mpd;
		['excesstop',
		'excessright',
		'excessbottom',
		'excessleft',
		'bigwidth',
		'bigheight'].forEach(function(el) {
			var value = _this.tpl.ancs['mapcover'].attr(el);
			value = value * 1;
			mpd[el] = isNaN(value) ? 0 : value;

		});
		mpd.clipped_height = mpd.bigheight - mpd.excesstop - mpd.excessbottom;
		mpd.clipped_width = mpd.bigwidth - mpd.excessleft - mpd.excessright;

	},
	checkSizes: function() {
		this.setVisState('con_width', this.tpl.ancs['controlls'].width());
	},
	'compx-curpos':{
		depends_on: ['selected_time', 'vis_con_width'],
		fn: function(factor, con_width) {
			if (!this.con_offset){
				this.con_offset = this.tpl.ancs['controlls'].offset();
			}
			var start_pos =  - this.half_width;


			var target_pos = start_pos + con_width * factor;
			this.tpl.ancs['scroll_marker'].css('left', target_pos + 'px');
		}
	},
	'compx-time_value': {
		depends_on: ['selected_time', 'cvs_data'],
		fn: function(selected_time, cvs_data) {
			if (cvs_data && typeof selected_time != 'undefined'){
				return cvs_data.run_gap * selected_time;
			}
		}
	},
	createLegendCount: function() {
		var container = this.tpl.ancs['legendcount'];
		var width = container.width();
		var height= container.height();

		$(this.legendcount.node()).css('width', width);

		var
			p1 = {x:0, y:0},
			p2 = {x: width, y:0},
			p3 = {x: width/2, y: height};


		var part_num = 6;

		var part_height = height/part_num;
		var lines = [];

		for (var i = 1; i < part_num; i++) {
			lines.push({
				y: Math.round(i * part_height) + 0.5
			});
		}

		var data = mh.formatPathPoints([p1, p2, p3]) + ' Z';

		var style = {
			fill: '#7FBFFF',
			stroke: 'none'
		};
		this.legendcount.append('path')
			.attr('d', data)
			.style(style);

		for (var i = 0; i < lines.length; i++) {
			var cur = lines[i];
			cur.x = mh.getDistance(0, width,  height, width/2, cur.y);
			this.legendcount.append('line')
				.attr({
					x1: 0,
					y1: cur.y,
					x2: width,
					y2: cur.y
				})
				.style({
					stroke: '#fff',
					'stroke-width': 0.5
				});
		}
		lines.unshift({
			x: width,
			y: 0
		});
		lines.push({
			x: width/2,
			y: height
		});
		this.promiseStateUpdate('count_lines', lines);
		this.countlines = lines;

	},
	'compx-legend_count':{
		depends_on: ['runners_rate', 'count_lines'],
		fn: function(runners_rate, count_lines) {
			if (!runners_rate || !count_lines){
				return;
			}
			var container = this.tpl.ancs['legendcount'];

			var width = container.width();

			//var count = mh.getStepValueByHeight(width, runners_rate.step);

			this.tpl.ancs['legendcounttext'].empty();

			var dfrg = document.createDocumentFragment();

			for (var i = 0; i < count_lines.length; i++) {
				if ((i + 1) % 2 != 1){
					continue;
				}
				var cur = count_lines[i];
				var count = Math.round(mh.getStepValueByHeight((  cur.x - width/2  ) * 2, runners_rate.step));
				var span = $('<span class="textblock"></span>');
				span.css({
					left: Math.round(cur.x),
					top: Math.round(cur.y)

				});
				span.text(count);

				$(dfrg).append(span);


			}

			this.tpl.ancs['legendcounttext'].append(dfrg);
			
			//this.tpl.ancs['legendcounttext'].text(Math.round(count));
			//console.log(maxcount)

		}
	},
	'compx-legend_age':{
		depends_on: ['cvs_data'],
		fn: function(cvs_data) {
			var container = this.tpl.ancs['legendage'];
			var width  = container.width();
			var height = container.height();
			var svg = this.legendage;
			svg.selectAll('*').remove();
			$(svg.node()).css('width', width);

			var space = 1;
			var vert_space = 1;
			var half_width = width / 2;
			//var _this = this;
			
			var max1 = cvs_data.big_genders_groups[1].age_groups.max;
			var max2 = cvs_data.big_genders_groups[0].age_groups.max;
			
			var lng1 = cvs_data.big_genders_groups[1].age_groups.lng;
			var lng2 = cvs_data.big_genders_groups[0].age_groups.lng;

            var height_factor = (height - vert_space * cvs_data.big_genders_groups[1].age_groups.length) / Math.max(lng1, lng2);
            var width_factor  = height_factor * (width - space) / (2 * (max1 + max2));
			
            // var width_factor = 0.1;

			var result_data = {
				text_desc:[]
			};

			var _this = this;

			(function(){
				var array = cvs_data.big_genders_groups[1].age_groups;
				var grad = _this.gender_grads[1];
				var limit = half_width - space/2;
				
				var el_top = 0;
				
                // console.log(array);
				
				for (var i = 0; i < cvs_data.big_genders_groups[1].age_groups.length; i++) {

                    var cur = cvs_data.big_genders_groups[1].age_groups[i];

                    var rstart = cvs_data.big_ages_ranges[i].start;
                    var rend   = cvs_data.big_ages_ranges[i].end;

                    // console.log(rstart);

					var y = el_top;
					var rheight = height_factor * (rend - rstart + 1);
					var rwidth  = (cur.length * width_factor / rheight);
					var x = limit - rwidth;
					                    
					var color = colors.getGradColor(i, 1, array.length, grad);

					svg.append('rect').attr({
						x: x,
						y: y,
						width:  rwidth,
						height: rheight,
						fill: color
					});

                    // console.log(rstart, rend, color, x, y, rwidth, rheight);
				
				    el_top = el_top + rheight + vert_space;
				};

			})();

			(function(){
				var array = cvs_data.big_genders_groups[0].age_groups;
				var grad = _this.gender_grads[0];
				var limit = half_width - space/2;
				
				var el_top = 0;
				
                // console.log(array);
                
                var max_length = 0;
                
                for (var i = 0; i < cvs_data.big_genders_groups[0].age_groups.length; i++) {
                    var cur = cvs_data.big_genders_groups[0].age_groups[i];

                    var rstart = cvs_data.big_ages_ranges[i].start;
                    var rend   = cvs_data.big_ages_ranges[i].end;

					var rwidth  = (cur.length * width_factor / (height_factor * (rend - rstart + 1)));
					                    
					if (rwidth > max_length) {
					    max_length = rwidth;
					}                
                }
				
				for (var i = 0; i < cvs_data.big_genders_groups[0].age_groups.length; i++) {

                    var cur = cvs_data.big_genders_groups[0].age_groups[i];

                    var rstart = cvs_data.big_ages_ranges[i].start;
                    var rend   = cvs_data.big_ages_ranges[i].end;

                    // console.log(rstart);

					var y = el_top;
					var rheight = height_factor * (rend - rstart + 1);
					var rwidth  = (cur.length * width_factor / rheight);
					var x = width - limit;
					                    
					var color = colors.getGradColor(i+1, 1, array.length, grad);

					svg.append('rect').attr({
						x: x,
						y: y,
						width:  rwidth,
						height: rheight,
						fill: color
					});

                    result_data.text_desc[i] = {
                     x: x + max_length,
                     y: y + rheight / 2
                    };

                    // console.log(rstart, rend, color, x, y, rwidth, rheight);
				
				    el_top = el_top + rheight + vert_space;
				};

			})();
			
			return result_data;
		}
	},
	'compx-legend_age_text':{
		depends_on: ['legend_age', 'cvs_data'],
		fn: function(legend_age, cvs_data) {
			if (!legend_age){
				return;
			}
			var con = this.tpl.ancs['legendage_textc'];
			con.empty();
			var dfrg = document.createDocumentFragment();

			for (var i = 0; i < cvs_data.big_ages_ranges.length; i++) {
				var cur = cvs_data.big_ages_ranges[i];
				$('<span class="textblock"></span>').appendTo(dfrg).css({
					top: Math.round(legend_age.text_desc[i].y),
					left: Math.round(legend_age.text_desc[i].x),
				}).text(cur.label);
				//cvs_data.big_ages_ranges[i]
			}
			con.append(dfrg);

		}
	},
	/*'compx-bigdata': {
		depends_on: ['geodata', 'cvs_data'],
		fn: function(geodata, cvs_data) {
			if (geodata && cvs_data){
				getHardMap(cvs_data, geodata, this.tpl.ancs['map-con'][0]);
				return {
					geodata: geodata,
					cvs_data: cvs_data
				};
			}
		}
	},*/

	/*
	var 
		var pjr = this.projection(pp.target);*/
	//point_left_edge
	//point_bottom_edge
	//point_bottom_middle
	getPointPxByDistance: function(geodata, distance) {
		var pp = mh.getPointAtDistance(geodata.geometry.coordinates, distance, true);

		var point = this.root_view.projection(pp.target);
		point[2] = pp.target[2];
		return point.map(Math.round);
	},
	'compx-point_bottom_middle':{
		depends_on: ['d3map_dets', 'geodata'],
		fn: function(d3map_dets, geodata) {
			if (d3map_dets && geodata){
				return this.getPointPxByDistance(geodata, 28700);
			}
		}
	},
	'compx-point_bottom_edge':{
		depends_on: ['d3map_dets', 'geodata'],
		fn: function(d3map_dets, geodata) {
			if (d3map_dets && geodata){
				return this.getPointPxByDistance(geodata, 22288);
			}
		}
	},
	'compx-point_left_edge':{
		depends_on: ['d3map_dets', 'geodata'],
		fn: function(d3map_dets, geodata) {
			if (d3map_dets && geodata){
				return this.getPointPxByDistance(geodata, 11116);
			}
		}
	},
	'compx-start_point':{
		depends_on: ['d3map_dets', 'geodata'],
		fn: function(d3map_dets, geodata) {
			if (d3map_dets && geodata){
				return this.getPointPxByDistance(geodata, 0);
			}
		}
	},
	'compx-end_point':{
		depends_on: ['d3map_dets', 'geodata'],
		fn: function(d3map_dets, geodata) {
			if (d3map_dets && geodata){
				var total_distance = d3.geo.length(geodata) * mh.earth_radius;
				return this.getPointPxByDistance(geodata, total_distance);
			}
		}
	},
	'compx-altitude_p1':{
		depends_on: ['d3map_dets', 'geodata', 'end_point'],
		fn: function(d3map_dets, geodata, end_point) {
			if (!d3map_dets || !geodata || !end_point){
				return;
			}

			var pp = this.getPointPxByDistance(geodata, 27132);
			pp.rel = pp[2] - end_point[2];
			return pp;
			
		}
	},
	'compx-altitude_p2':{
		depends_on: ['d3map_dets', 'geodata', 'end_point'],
		fn: function(d3map_dets, geodata, end_point) {
			if (!d3map_dets || !geodata || !end_point){
				return;
			}
		}
	},
	'compx-mapcover-hor': {
		depends_on: ['trackwidth', 'track_left_padding'],
		fn: function(trackwidth, track_left_padding) {
			if (trackwidth){
				track_left_padding = track_left_padding || 0;
				var mpd = this.mapcover_data;
				var width_factor = trackwidth/mpd.clipped_width;
				this.tpl.ancs['mapcover'].css({
					width: width_factor * mpd.bigwidth,
					left: track_left_padding -  mpd.excessleft * width_factor
				});
			}

		}
	},
	'compx-mapcover-vert':{
		depends_on: ['trackheight', 'track_top_padding'],
		fn: function(trackheight, track_top_padding) {
			if (trackheight){
				track_top_padding = track_top_padding || 0;
				var mpd = this.mapcover_data;
				var height_factor = trackheight/mpd.clipped_height;
				this.tpl.ancs['mapcover'].css({
					height: height_factor * mpd.bigheight,
					top: track_top_padding -  mpd.excesstop * height_factor
				});
			}

		}
	},
	/*'stch-start_point': function(state) {
		//this.start_point.toggleClass('')
	},
	'stch-end_point': function(state) {

	},*/

	tpl_events:{
		
	},
	tpl_r_events:{
		
	}
});
return RunMapCompxCtr;
});