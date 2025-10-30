// Prevents CAP console plugin from initializing during test runs.
if (process.env.NODE_ENV !== 'test') {
  import('@sap/cds').then(({ default: cds }) => {
    cds.on('served', async () => {
      const { default: main } = await import('./dist/index.js');
      main();
    });
  });
}
