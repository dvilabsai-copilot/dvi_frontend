export function AccountsSync() {
  return (
    <main className="min-h-screen bg-[#f5f8fc] p-4 text-[#17233d] md:p-6">
      <section className="rounded-lg border border-[#dbe4f1] bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold">Tally / Zoho Sync</h1>
        <p className="mt-1 text-sm text-[#71809a]">Accounting integrations for Accounts &amp; Finance.</p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {["Tally", "Zoho Books"].map((provider) => (
            <div key={provider} className="rounded-lg border border-[#e5ebf4] bg-[#f9fbfe] p-5">
              <h2 className="font-semibold">{provider}</h2>
              <p className="mt-2 text-sm text-[#71809a]">Integration unavailable</p>
              <p className="mt-1 text-xs text-[#8b99ad]">No configured frontend API or connection is available.</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
