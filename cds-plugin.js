import cds from '@sap/cds';

import main from './dist/index.js';

cds.on('served', main);
