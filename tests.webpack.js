//var testsContext = require.context('./spec', true, /\.spec\.js$/);
//testsContext.keys().forEach(testsContext);

var srcContext = require.context('./src', true, /\.spec\.js$/);
srcContext.keys().forEach(srcContext);