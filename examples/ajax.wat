;; log
<- [HTTP; CONSOLE] [LIBRARY];
<- [hlp; signal; signals] [HTTP];
<- [console_log] [CONSOLE];
:= [root; "../examples/"];
signals [.: [~ [root; "hlp1.hlp"]; ~ [root; "hlp2.hlp"]]; 
         -> [fns; 
             >> [:: values [fns]; -> [fn; console_log[fn[1; 2]]]]]];
