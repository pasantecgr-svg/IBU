(async ()=>{
  try {
    const mod = await import('../src/utils/dbClient.js');
    console.log('dbClient module keys:', Object.keys(mod));
    const prisma = mod.default || mod.prisma || mod;
    if (!prisma) throw new Error('Prisma client not found in import');

    console.log('Prisma client keys:', Object.keys(prisma));

    const ordenId = '78720239-b055-40e5-9407-df18b903ec51';
    console.log('Checking ot_items for orden:', ordenId);
    const items = await prisma.ot_items.findMany({ where: { orden_id: ordenId } });
    console.log('Found items:', JSON.stringify(items, null, 2));

    const all = await prisma.ot_items.findMany({});
    console.log('Total ot_items count:', all.length);

    const prod = await prisma.productos.findMany({ where: { nombre: 'Cable UTP' } });
    console.log('Productos named Cable UTP:', JSON.stringify(prod, null, 2));

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
