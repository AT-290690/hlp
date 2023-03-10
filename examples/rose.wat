<- [SKETCH] [LIBRARY];
<- [make_scene; set_stroke; no_fill;
    make_group; background; get_rotation;
    width; height; no_stroke; 
    draw; make_rectangle; play; 
    set_fill; set_opacity; set_rotation] [SKETCH];
make_scene [300; 300; -> [: [

:= [arr; .: []];
:= [strokes; .: []];
:= [shadows; .: []];

*loop [16; -> [i; .:append [arr; |> [
  make_rectangle [width [0.5]; height [0.5]; + [10; * [i; 10]]; + [10; * [i; 10]]]; 
  set_rotation [* [i; 0.5]]; 
  set_opacity [* [0.02; i]]; 
  set_fill ["crimson"]; 
  no_stroke []]]]];

*loop [16; -> [i; .:append [strokes; |> [
  make_rectangle [width [0.5]; height [0.5]; + [10; * [i; 10]]; + [10; * [i; 10]]]; 
  set_rotation [* [i; 0.5]]; 
  set_opacity [- [1; * [0.01; i]]]; 
  set_stroke ["darkred"]; 
  no_fill []]]]];

*loop [10; -> [i; .:append [shadows; |> [
  make_rectangle [width [0.5]; height [0.5]; + [10; * [i; 10]]; + [10; * [i; 10]]]; 
  set_rotation [* [i; 0.5]]; 
  set_opacity [* [0.03; i]]; 
  set_fill ["black"]; 
  no_stroke []]]]];
draw [0; -> [frame; delta; : [
  >> [arr; 
        -> [leaf; i; a; set_rotation [leaf; 
        + [get_rotation [leaf]; * [i; 0.001]]]]];
  >> [strokes; 
        -> [leaf; i; a; set_rotation [leaf; 
        + [get_rotation [leaf]; * [i; 0.001]]]]];
  >> [shadows; 
        -> [leaf; i; a; set_rotation [leaf;
        + [get_rotation [leaf]; * [i; 0.001]]]]]]]];
play []]]];