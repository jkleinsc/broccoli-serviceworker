function logDebug() {
  if (toolbox.options.debug) {
    if (arguments.length > 1) {
      var consoleArgs = [];
      for (var i=1;i<arguments.length;i++) {
        consoleArgs.push(arguments[i]);
      }
      console.log(arguments[0], consoleArgs);
    } else {
      console.log(arguments[0]);
    }
  }
}
