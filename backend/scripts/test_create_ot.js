(async ()=>{
  try {
    const fetch = globalThis.fetch || (await import('node-fetch')).default;
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlZTliNzRjYi1lMGE0LTRhZGEtOGM2Yi03NjZkYTJlOTk3YWUiLCJlbWFpbCI6InBydWViYXNAdW5pYmFndWUuZWR1LmNvIiwicm9sZSI6IlVTRVIiLCJpYXQiOjE3ODkwODAwNzksImV4cCI6MTc4OTEwODg3OX0.yzbB6sZzzxxx34LghGQ50nBROTdQQRIBDFkOfRMRuAc';
    const base = 'http://localhost:3001';
    const headers = { 'content-type': 'application/json', authorization: 'Bearer ' + token };

    console.log('Ensuring category exists...');
    let r = await fetch(base + '/api/categorias', { method: 'GET', headers });
    let catList = await r.json();
    let categoria_id = null;
    if (catList && catList.success && Array.isArray(catList.categorias)) {
      const found = catList.categorias.find(c => c.nombre === 'Cables');
      if (found) categoria_id = found.id;
    }
    if (!categoria_id) {
      r = await fetch(base + '/api/categorias', { method: 'POST', headers, body: JSON.stringify({ nombre: 'Cables' }) });
      const cat = await r.json();
      console.log('Category create response:', JSON.stringify(cat, null, 2));
      categoria_id = cat.categoria?.id;
    }
    if (!categoria_id) throw new Error('Failed to obtain category id');

    console.log('Ensuring product exists...');
    r = await fetch(base + '/api/productos', { method: 'GET', headers });
    let prodList = await r.json();
    let producto_id = null;
    if (prodList && prodList.success && Array.isArray(prodList.productos)) {
      const found = prodList.productos.find(p => p.nombre === 'Cable UTP');
      if (found) producto_id = found.id;
    }
    if (!producto_id) {
      r = await fetch(base + '/api/productos', { method: 'POST', headers, body: JSON.stringify({ nombre: 'Cable UTP', categoria_id, cantidad_total: 100, unidad: 'metros', metraje_total: 100, metraje_restante: 100 }) });
      const prod = await r.json();
      console.log('Product create response:', JSON.stringify(prod, null, 2));
      producto_id = prod.producto?.id;
    }
    if (!producto_id) throw new Error('Failed to obtain product id');

    console.log('Creating OT...');
    r = await fetch(base + '/api/ordenes', { method: 'POST', headers, body: JSON.stringify({ titulo: 'OT prueba', descripcion: 'Prueba automatizada', mantis_ticket: 'MT-123', items: [{ producto_id, cantidad: 5, metraje_usado: 10, cable_descripcion: 'UTP Cat5e' }] }) });
    const orden = await r.json();
    console.log('Create order response:', JSON.stringify(orden, null, 2));

    console.log('Fetching product after OT...');
    r = await fetch(base + `/api/productos/${producto_id}`, { method: 'GET', headers });
    const prodAfter = await r.json();
    console.log('Product after:', JSON.stringify(prodAfter, null, 2));
  } catch (e) {
    console.error('Error in test script:', e);
    process.exit(1);
  }
})();
