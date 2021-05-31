require('global-agent/bootstrap');

// To use proxy, SET GLOBAL_AGENT_HTTP_PROXY=http://localhost:8888

const JSDOMEnvironment = require('jest-environment-jsdom');

class JSDOMEnvironmentWithProxy extends JSDOMEnvironment {
  setup() {
    if (process.env.GLOBAL_AGENT_HTTP_PROXY) {
      const { ResourceLoader } = require('jsdom');
      const resources = new ResourceLoader({ strictSSL: false });

      // HACK: We cannot set ResourceLoader thru testEnvironmentOptions.resources.
      //       This is because the ResourceLoader instance constructor is of "slightly" different type when on runtime (probably Jest magic).
      //       Thus, when we set it thru testEnvironmentOptions.resources, it will fail on "--watch" but succeed when running without watch.
      this.global._resourceLoader = resources;

      return super.setup();
    }
  }
}

module.exports = JSDOMEnvironmentWithProxy;
