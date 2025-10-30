// Prevents CAP console plugin from initializing during Jest test runs.
if (process.env.NODE_ENV !== 'test' || !process.env.JEST_WORKER_ID) {
  import('@sap/cds').then(({ default: cds }) => {
    cds.on('served', async () => {
      const { default: main } = await import('./dist/index.js');
      main();
    });
  });
}
