module.exports = {
  modify: (config, { target, dev }, webpack) => {
    config.plugins.push(
      new webpack.DefinePlugin({
        AWS_ACCESS_KEY: JSON.stringify(process.env.AWS_ACCESS_KEY),
        AWS_SECRET_KEY: JSON.stringify(process.env.AWS_SECRET_KEY),
        AWS_REGION: JSON.stringify(process.env.AWS_REGION),
        AWS_BUCKET: JSON.stringify(process.env.AWS_BUCKET)
      })
    );
    return config;
  }
};
