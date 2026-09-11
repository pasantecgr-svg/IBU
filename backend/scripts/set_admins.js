(async ()=>{
  try {
    const mod = await import('../src/utils/dbClient.js');
    const prisma = mod.default || mod.prisma || mod;
    if (!prisma) throw new Error('Prisma client not found in import');

    const admins = ['cgr@unibague.edu.co', 'ibu@unibague.edu.co'];

    for (const email of admins) {
      const usuario = await prisma.usuarios.findUnique({ where: { email } });
      if (!usuario) {
        console.log(`No existe usuario con email ${email}`);
        continue;
      }
      if (usuario.role === 'ADMIN') {
        console.log(`${email} ya es ADMIN`);
        continue;
      }
      await prisma.usuarios.update({ where: { email }, data: { role: 'ADMIN' } });
      console.log(`Usuario ${email} actualizado a ADMIN`);
    }

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
