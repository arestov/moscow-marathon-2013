define(['d3', 'provoda', 'spv', './modules/maphelper', 'jquery', './modules/colors', 'moment'], function(d3, provoda, spv, mh, $, colors, moment) {
"use strict";

var TimeGraphCtr = function() {};
provoda.View.extendTo(TimeGraphCtr, {
	bindBase: function() {

		var svg = document.createElementNS(mh.SVGNS, 'svg');
		this.svgc = $(svg).css('display', 'none');
		this.svg = d3.select(svg);

		this.wch(this.root_view, 'maxwdith', spv.debounce(function() {
			this.checkSizes();
		},100));
		this.wch(this, 'vis_con_appended', function(e) {
			if (e.value){
				this.checkSizes();
			}
			this.setVisState('ready', e.value);
			
		});
		this.areas_group = this.svg.append('g');


		var _this = this;

		var checkPointerMove = function(e) {
			_this.checkPointerMove(e);
		};



		this.c
		.on('mouseenter', function() {
			_this.coffset = _this.c.offset();
			$(window.document).on('mousemove', checkPointerMove);
		})
		.on('mouseleave', function() {

			$(window.document).off('mousemove', checkPointerMove);
			_this.promiseStateUpdate('selector', false);
		});
		this.promiseStateUpdate('px_step', this.px_step);

		this.timemarksg1 = this.svg.append('g');
		this.timemarksg2 = this.svg.append('g');
		this.c.append(svg);
	},
	checkSizes: function() {
		var result = {};
		var container = this.c;
		
		if (container[0]){
			result.width = container.width();
		}
		this.original_height = container.height();
//		result.height = ;
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
	'compx-hours_steps':{
		depends_on: ['cvs_data'],
		fn: function(cvs_data) {
			if (!cvs_data){
				return;
			}
			var step = 60*60;

			var items = [];
			var cur = 0;
			while (cur < cvs_data.run_gap){
				items.push({
					relative_to_start: cur * 1000,
					relative_to_day: cvs_data.start_time + cur * 1000,
					value: cur
				});
				cur += step;
				//cur = Math.min(cur, cvs_data.run_gap);
			}
			items.pop();
			items.push({
				relative_to_start: cvs_data.run_gap * 1000,
				relative_to_day: cvs_data.start_time + cvs_data.run_gap * 1000,
				value: cvs_data.run_gap,
				last: true
			});
			return items;

		}
	},
	'compx-hours_marks':{
		depends_on: ['hours_steps', 'cvs_data', 'width'],
		fn: function(hours_steps,cvs_data, width) {
			if (!hours_steps || !cvs_data || !width){
				return;
			}
			var node  = this.tpl.ancs['timeline_textc'];
			node.empty();
			var width_factor = width/cvs_data.run_gap;
			var dfrg = document.createDocumentFragment();

			
			var createText = function(cur, from_start) {
				var tstr;
				if (from_start) {
					tstr = moment(cvs_data.start_time).startOf('day')
					.add( cur.relative_to_start)

					.format(cur.last ? 'HH:mm:ss' : 'HH:mm');
				} else {
					tstr = moment(cur.relative_to_day)
					.zone(-240)
					.format(cur.last ? 'HH:mm:ss' : 'HH:mm');
				}
				var span_top = $('<span class="tl_text_mark"></span>').appendTo(dfrg);
				if (from_start){
					span_top.addClass('mark_bottom');
				} else {
					span_top.addClass('mark_top');
				}

				$('<span class="just_text_of_mark"></span>').text(tstr).appendTo(span_top);


				span_top.css('left', width_factor * cur.value);
				if (cur.last){
					span_top.addClass('last_mark');
				}
			};

			for (var i = 0; i < hours_steps.length; i++) {
				var cur = hours_steps[i];
//				var full_format = 
				createText(cur);
				createText(cur, true);
				
				
			}

			$(dfrg).appendTo(node);

		}
	},
	'compx-timesteps': {
		depends_on: ['cvs_data'],
		fn: function(cvs_data) {
			var step = 20*60;

			var items = [];
			var cur = 0;
			while (cur < cvs_data.run_gap){
				items.push(cur);
				cur += step;
				//cur = Math.min(cur, cvs_data.run_gap);
			}
			//items.pop();
			items.push(cvs_data.run_gap);
			return items;

		}
	},
	'compx-marks': {
		depends_on: ['timesteps', 'base_graph_data'],
		fn: function(timesteps, base_graph_data) {
			if (timesteps && base_graph_data){
				var result = [];
				this.timemarksg1.selectAll('*').remove();
				this.timemarksg2.selectAll('*').remove();
				var mheight = 4;
				for (var i = 0; i < timesteps.length; i++) {
					var line1 = this.timemarksg1.append('line');
					line1.attr({
						y1: 0,
						y2: mheight,
						'stroke':'#CBCBCB',
						'stroke-width':1
					});
					var line2 = this.timemarksg1.append('line');
					line2.attr({
						y1: this.height,
						y2: this.height - mheight,
						'stroke':'#CBCBCB',
						'stroke-width':1
					});
					result.push({
						top: line1,
						bottom: line2
					});

					//timesteps[i]
				}
				return result;
			}

		}
	},
	'compx-marks_done': {
		depends_on: ['marks', 'bd', 'cvs_data', 'timesteps'],
		fn: function(marks, bd, cvs_data, timesteps) {
			if (marks && bd && cvs_data && timesteps){
				var width_factor = this.width/cvs_data.run_gap;
				for (var i = 0; i < marks.length; i++) {
					var val =  width_factor * timesteps[i];
					var attrs = {
						x1: val,
						x2: val
					};
					marks[i].top.attr(attrs);
					marks[i].bottom.attr(attrs);
				}
				return [];
			}
			
		}
	},
	'compx-bd': {
		depends_on: ['width', 'vis_ready'],
		fn: function(width, vis_ready) {
			if ( !width || !vis_ready){
				return;
			}
			//var container = this.c.parent();
			//container.css('height', height);
			this.width = width;
			//this.height = height;
			this.svgc.css('display', '');
			this.svg.attr({
				width: this.width
				//height: this.height
			});

	
				
			return Date.now();
		}
	},
	'compx-total_distance':{
		depends_on: ['geodata'],
		fn: function(geodata) {
			if (geodata){
				return d3.geo.length(geodata) * mh.earth_radius;
			}
		}
	},
	'compx-basedet': {
		depends_on: ['total_distance', 'bd'],
		fn: function(total_distance, bd) {
			if (total_distance && bd){
				
				return Date.now();
			}
			
		}
	},
	'compx-age_areas': {
		depends_on: ['cvs_data'],
		fn: function(cvs_data) {
			if (!cvs_data){
				return;
			}

			this.areas_group.selectAll('*').remove();
			var age_areas = {};


			var array = cvs_data.runners_groups.slice();//.reverse();
			var _this = this;
			array.forEach(function(el) {
				var grad = _this.parent_view.gender_grads[el.gender];
				var color = colors.getGradColor(el.num, 1, el.groups_count, grad);
				age_areas[ el.key ] = (_this.areas_group.append('path').style({
					stroke: 'none',
					"fill": color
				}));

			});
			return age_areas;
		}
	},
	px_step: 3,
	y_scale: 1.2,
	'compx-base_graph_data': {
		depends_on: ['basedet', 'cvs_data', 'current_runners_data'],
		fn: function(basedet, cvs_data, current_runners_data) {
			if (!basedet || !cvs_data || !current_runners_data){
				return;
			}

			
			var px_step = this.px_step;
			var steps = this.width/px_step;

			steps = Math.floor(steps);


			var time_step = (cvs_data.last_finish_time - cvs_data.start_time)/steps;

			

			var makeStep = function(step_num, runners) {
				var result = [];
				var range_start = cvs_data.start_time + step_num * time_step;
				var range_end = range_start + time_step;
				for (var i = 0; i < runners.length; i++) {
					var cur = runners[i];
					if (cur.end_time > range_start &&  cur.end_time <= range_end){
						result.push(cur);
						//cur.finish_g = result;
					} else {

					}
				}
				return result;
			};
			var getRunnersByTime = function(runners) {
				//var has_data = {};
				var runners_by_time = [];
				//var max_runners;
				
				for (var i = 0; i < steps; i++) {
					var array = makeStep(i, runners);
					runners_by_time.push(array);
				//	max_runners = Math.max(max_runners, array.length);
					if (array.length){
					//	has_data[i] = array.length;
					}

				}
			//	runners_by_time.max_runners = max_runners;
				return runners_by_time;
			};

			var reversed_groups = current_runners_data.runners_groups.slice();
			reversed_groups.reverse();

			var runners_byd = {};

			current_runners_data.runners_groups.forEach(function(el) {
				runners_byd[el.key] = getRunnersByTime(el.runners);
			});
			var steps_data = [];
			var getMaxInStep = function(step_num) {
				var summ = 0;
				var all_runners_in_step = [];
				reversed_groups.forEach(function(el) {
					summ += runners_byd[el.key][step_num].length;
					all_runners_in_step.push.apply(all_runners_in_step, runners_byd[el.key][step_num]);
				});

				steps_data.push(all_runners_in_step);
				return summ;
			};



			var max_runners_in_step = 0;
			for (var i = 0; i < steps; i++) {
				max_runners_in_step = Math.max(max_runners_in_step, getMaxInStep(i));
			}
			
			this.height = Math.max(this.original_height, max_runners_in_step * this.y_scale);



			var height_factor = this.height/ (max_runners_in_step * this.y_scale);
			this.c.css('height', this.height);
			this.svgc.css('height', this.height);
//			this.height/();

			return {
				steps: steps,
				px_step: px_step,
				height_factor: height_factor,
				runners_byd: runners_byd,
				steps_data: steps_data
			};


		}
	},
	'compx-height_factor': {
		depends_on: ['base_graph_data'],
		fn: function(base_graph_data) {
			return base_graph_data && base_graph_data.height_factor;
		}
	},
	checkPointerMove: function(e) {
			//this.coffset
		var pos = e.pageX - this.coffset.left;


		var pos_x = Math.floor(pos/this.px_step);
		if (pos_x < 0){
			this.promiseStateUpdate('selector', false);
			return;
		}
		var base_graph_data = this.state('base_graph_data');
		if (!base_graph_data){
			this.promiseStateUpdate('selector', false);
			return;
		}

		var pos_y = Math.floor((this.height - (e.pageY - this.coffset.top))/base_graph_data.height_factor);

		if (pos_y < 0){
			this.promiseStateUpdate('selector', false);
			return;
		}

		this.promiseStateUpdate('selector', {
			pos_x_factor: this.width/pos,
			pos_x: pos_x,
			pos_y: pos_y
		});
	},
	age_words: ['год', 'года', 'лет'],
	'compx-selector_matching': {
		depends_on: ['selector', 'base_graph_data', 'cvs_data'],
		fn: function(sel, base_graph_data, cvs_data) {
			if (!sel || !base_graph_data || !cvs_data){
				return;
			}
			var used_selector = {};
			var getByS = function(pos_x, pos_y) {
				used_selector.pos_x = pos_x;
				used_selector.pos_y = pos_y;
				return spv.getTargetField(base_graph_data.steps_data, [pos_x, pos_y]);

			};
			var matched = getByS(sel.pos_x, sel.pos_y);
			if (!matched){
				matched = getByS(sel.pos_x +1, sel.pos_y);
			}
			if (!matched){
				matched = getByS(sel.pos_x -1, sel.pos_y);
			}
			if (!matched){
				matched = getByS(sel.pos_x, sel.pos_y + 1);
			}
			if (!matched){
				matched = getByS(sel.pos_x, sel.pos_y - 1);
			}



			/*
			
			if (matched){
				console.log(matched.full_name);
			} else {
				console.log(sel.pos_x, sel.pos_y);
			}*/
			if (!matched){
				return;
			} else {
				if (!matched.end_time_string){
					matched.end_time_string = moment(matched.end_time).format('H:mm:ss');
				}
				if (!matched.age_years && matched.birthyear){
					var age = (new Date(cvs_data.start_time)).getFullYear() - matched.birthyear;

					matched.age_years = age + ' ' + this.age_words[spv.getUnitBaseNum(age)];
	
				}
				return {
					runner: matched,
					selector: used_selector
				};
			}
			
		}
	},
	'compx-draw': {
		depends_on: ['base_graph_data', 'current_runners_data', 'age_areas'],
		fn: function(base_graph_data, current_runners_data, age_areas) {
			if (!base_graph_data || !current_runners_data ||!age_areas){
				return;
			}
			var _this = this;

			var reversed_groups = current_runners_data.runners_groups.slice();
			reversed_groups.reverse();
			var points_byd = {};

			var steps = base_graph_data.steps;
			var px_step = this.px_step;
			var height_factor = base_graph_data.height_factor;
			var runners_byd = base_graph_data.runners_byd;

			var getRunByDPoints = function(array, prev_array) {

				var result = [];
				for (var i = 0; i < steps; i++) {
					var x1 = i * px_step;
					var x2 = x1 + px_step;
					var y = _this.height - height_factor * array[i].length;
					if (prev_array){
						var prev_v = prev_array[i *2];
						y = y - (_this.height - prev_v.y);
					}
					



					result.push({
						x: x1,
						y: y
					}, {
						x: x2,
						y: y
					});
				}
				return result;
			};
			
			reversed_groups.forEach(function(el, i) {
				var prev = reversed_groups[i-1];
				prev = prev && points_byd[prev.key];
				points_byd[el.key] = getRunByDPoints(runners_byd[el.key], prev);
			});



			var areas_data = {};

			var getRunByDPathData = function(array) {
				var result = '';
				result += 'M' + mh.format({x: array[0].x, y: _this.height});
				for (var i = 0; i < array.length; i++) {
					result += ' L' + mh.format(array[i]);
				}
				result += ' L' + mh.format({x: (array[array.length - 1]).x, y: _this.height});
				result += ' Z';
				return result;
			};
			current_runners_data.runners_groups.forEach(function(el) {
				
				areas_data[el.key] = getRunByDPathData(points_byd[el.key]);
			});


			current_runners_data.runners_groups.forEach(function(el) {
				age_areas[el.key].attr("d", areas_data[el.key]);
			});

			return {
				runners_byd: runners_byd,
				points_byd: points_byd,
				areas_data: areas_data,
				height_factor: height_factor
			};
		}
		
	}
});

return TimeGraphCtr;

});