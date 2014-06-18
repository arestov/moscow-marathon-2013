define(['provoda', 'jquery', 'spv'], function(provoda, $, spv) {
"use strict";
var cvs_data;


var Cvsloader = function() {};
provoda.Eventor.extendTo(Cvsloader, {
	'regfr-cvload': {
		test: function(namespace) {
			return namespace.indexOf('load') === 0;
		},
		fn: function() {
			return cvs_data;
		},
	}
});
var eventor = new Cvsloader();
eventor.init();

/*eventor.onRegistration('load', function(cb) {
	if (cvs_data){
		cb(cvs_data);
	}
});*/


var checkData = function() {
	if (cvs_data){
		var cvs = cvs_data.items;
		cvs.sort(function(a, b){
			return spv.sortByRules(a, b, [{
				field: ['result_time'],
				reverse: false
			}]);
		});

		


		

		var last_finish_time = 0;

		for (var i = 0; i < cvs.length; i++) {

			last_finish_time = Math.max(last_finish_time, cvs[i].end_time);
		}

		/*
		18-19, 20-22, 23-34, 35-39, 40-44, 45-49, 50-54, 55-59, 60-64, 65+

18-22
23-34
35-49
50-65
65+

		v


		*/

		var big_ages_group = [
			{
				start: 18,
				end: 19,
				label: '18-19'
			},{
				start: 20,
				end: 22,
				label: '20-22'
			},{
				start: 23,
				end: 34,
				label: '23-34'
			},{
				start: 35,
				end: 39,
				label: '35-39'
			},{
				start: 40,
				end: 44,
				label: '40-44'
			},{
				start: 45,
				end: 49,
				label: '45-49'
			},{
				start: 50,
				end: 54,
				label: '50-54'
			},{
				start: 55,
				end: 59,
				label: '55-59'
			},{
				start: 60,
				end: 64,
				label: '60-64'
			},{
				start: 65,
				end: 72,
				label: '65+'
			}
		];

		var small_ages_group = [
			{
				start: 18,
				end: 22,
				label: '18-22'
			},{
				start: 23,
				end: 34,
				label: '23-34'
			},{
				start: 35,
				end: 49,
				label: '35-49'
			},{
				start: 50,
				end: 65,
				label: '50-65'
			},{
				start: 65,
				end: 72,
				label: '65+'
			}
		];

		var age_ranges_to_use = small_ages_group;
		var age_field = ['birthyear'];

		var start_year = (new Date(cvs_data.start_time)).getFullYear();

		var getAgeGroups = function(array, ranges, field){
			var age_groups = [];
			var r = array;
			var max = 0;
			var lng = 0;
			
			for (var i = 0; i < ranges.length; i++) {

				var age_range = ranges[i];
				
				var g = spv.filter(r, field, function(value) {
					var date = start_year - value;
					if (date >= age_range.start && date <= age_range.end){
						return true;
					}
				});
				
				age_groups.push(g);
				r = g.not;
				max = Math.max(max, (g.length / (age_range.end + 1 - age_range.start)));
				lng = lng + age_range.end + 1 - age_range.start;
                // console.log(lng);
			}
			
			age_groups.max = max;
			age_groups.lng = lng;

			return age_groups;
		};

		var getGenderAgesGroups = function(age_ranges_to_use) {
			var genders_groups = [{
				raw: []
			}, {
				raw: []
			}];
			var runners_groups = [];

			var i;
			for ( i = 0; i < cvs.length; i++) {
				
				genders_groups[cvs[i].gender].raw.push(cvs[i]);
			}
			genders_groups.forEach(function(el) {
				el.age_groups = getAgeGroups(el.raw, age_ranges_to_use, age_field);
			});
			for ( i = 0; i < genders_groups[0].age_groups.length; i++) {
				runners_groups.push({
					key: 0 + '-' + i,
					num: i + 1,
					groups_count: genders_groups[0].age_groups.length,
					gender: 0,
					runners: genders_groups[0].age_groups[i]
				});
			}
			for ( i = genders_groups[1].age_groups.length - 1; i >= 0; i--) {
				runners_groups.push({
					key: 1 + '-' + i,
					num: i + 1,
					groups_count: genders_groups[1].age_groups.length,
					gender: 1,
					runners: genders_groups[1].age_groups[i]
				});
			}
			runners_groups.reverse();


			return {
				genders_groups: genders_groups,
				runners_groups: runners_groups
			};
		};
		var setRunnersGroupMark = function(runners_groups, marker_prop) {
			if (!marker_prop){
				throw new Error();
			}
			runners_groups.forEach(function(el) {
				for (var i = 0; i < el.runners.length; i++) {
					el.runners[i][marker_prop] = el.key;
					el.runners[i][marker_prop + '_full'] = el;
				}
			});
		};

		var ga_groups = getGenderAgesGroups(age_ranges_to_use);
		var big_ga_groups = getGenderAgesGroups(big_ages_group);
		setRunnersGroupMark(big_ga_groups.runners_groups, 'big_genderage_group');
		/*var bad = [];
		for (var i = 0; i < cvs_data.items.length; i++) {
			if (!cvs_data.items[i].big_genderage_group){
				bad.push(cvs_data.items[i]);
			}
			
		}
		console.log(bad);*/

		cvs_data.getAgeGroups = getAgeGroups;
		cvs_data.genders_groups = ga_groups.genders_groups;
		cvs_data.runners_groups = ga_groups.runners_groups;
		cvs_data.big_genders_groups = big_ga_groups.genders_groups;

		cvs_data.last_finish_time = last_finish_time;
		cvs_data.run_gap = (last_finish_time - cvs_data.start_time)/1000;
		cvs_data.age_ranges = age_ranges_to_use;
		cvs_data.big_ages_ranges = big_ages_group;
		eventor.trigger('load', cvs_data);
	}
};

var frame;
$(window).on('message', function(e) {
	var message = e.originalEvent.data;
	if (message && message.cvs_data){
		cvs_data = message.data;
		$(frame).remove();
		//console.log(e.originalEvent.data);
		checkData();
	}
	
});

$(function() {

frame = document.createElement('iframe');
$(frame)
	.css({
		visibility: 'hidden',
		position: 'absolute',
		top: 0,
		left: '-1000px'
	})
	.attr('src', 'data/data3/data3.html')
	.on('load', function() {
		frame.contentWindow.postMessage('send_data','*');
	})
	.appendTo(document.body);




});

return eventor;
});