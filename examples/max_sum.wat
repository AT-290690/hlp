;; log
:= [loop; -> [i; nums; maxGlobal; maxSoFar;
    ? [< [i; .: length [nums]]; : [
    = [maxGlobal; math_max [maxGlobal; = [maxSoFar; math_max [0; + [maxSoFar; .: . [nums; i]]]]]];
    loop [+= [i]; nums; maxGlobal; maxSoFar]];
    maxGlobal]]]
[0; .: [1; -2; 10; -5; 12; 3; -2; 3; -199; 10]; * [math_infinity[]; -1]; * [math_infinity[]; -1]]