(async ()=>{
  try {
    const mod = await import('../src/utils/dbClient.js');
    const prisma = mod.default || mod.prisma || mod;
    if (!prisma) throw new Error('Prisma client not found in import');

    const admins = ['pasantecgr@unibague.edu.co', 'ibu@unibague.edu.co', 'cgr@unibague.edu.co'];

    for (const email of admins) {
      const nombre = email.split('@')[0];
      const usuario = await prisma.usuarios.upsert({
        where: { email },
        update: { role: 'ADMIN' },
        create: { email, nombre, role: 'ADMIN', password_hash: null, google_id: null }
      });
      console.log(`${usuario.email} configurado como ADMIN`);
    }

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
