;; max_sub_array_recursive
<- [MATH] [LIBRARY];
<- [max; infinity] [MATH];

~= [loop; -> [i; nums; maxGlobal; maxSoFar;
    ? [< [i; .:length [nums]]; : [
    = [maxGlobal; max [maxGlobal; = [maxSoFar; max [0; + [maxSoFar; ^ [nums; i]]]]]];
    loop [+= [i]; nums; maxGlobal; maxSoFar]];
    maxGlobal]]]
[0; .: [1; -2; 10; -5; 12; 3; -2; 3; -199; 10]; * [infinity; -1]; * [infinity; -1]]