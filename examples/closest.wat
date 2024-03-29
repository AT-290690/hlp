:= [distance; -> [x1; y1; x2; y2; 
		math_sqrt [+ [math_pow2 [- [x2; x1]]; 
				math_pow2 [- [y2; y1]]]]]; 
	to_distance; -> [a; b; 
		distance [.:< [a]; 
			.:> [a]; 
			.:< [b]; 
			.:> [b]]]; 
	to_distances; -> [points; target; 
		.:map>> [points; 
			-> [x; i; 
				to_distance [x; target]]]]; 
	get_min_dist; -> [distances; 
		.:reduce>> [distances; 
			-> [acc; x; 
				math_min [acc; x]]; math_INFINITY]]; 
	closest; -> [points; target; 
		: [:= [min_dist; |> [points; 
					to_distances [target]; 
					get_min_dist []]]; 
			.:find>> [points; 
				-> [x; 
					== [to_distance [x; target]; min_dist]]]]]];