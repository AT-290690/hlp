:= [is_odd; -> [x; == [% [x; 2]; 0]]];
:= [is_even; -> [x; % [x; 2]]];

:= [arr; .: [1; 2; 3; 4; 5]];

.: [
    |> [arr; .:filter [is_odd]]; 
    |> [arr; .:filter [is_even]];
  ];
