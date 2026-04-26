/* Budget compatibility entrypoint.
   The full Budget module now lives in js/pages/budget/index.js so the direct
   page bundle stays below the Phase 2 file-size gate. */
(function () {
  "use strict";
  var script = document.createElement("script");
  script.defer = true;
  script.src = "js/pages/budget/index.js";
  document.currentScript?.after(script);
})();
