;; @mock := [nums; .: [1; 2; 3; 4; 5; 6]]
;; @test == [fn [^ [nums; 1]]; 4]
;; @test === [.: map >> [nums; fn]; .: [2; 4; 6; 8; 10; 12]]
:= [fn; -> [x; : [
            ;; @check ?== [x; 1];
            * [x; 2]]]];
fn [21];

