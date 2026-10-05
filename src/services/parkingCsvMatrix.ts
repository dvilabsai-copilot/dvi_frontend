function readCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  text = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (!quoted && c === ',') {
      row.push(cell); cell = "";
    } else if (!quoted && (c === '\r' || c === '\n')) {
      row.push(cell);
      if (row.some(value => value.trim())) rows.push(row);
      row = []; cell = "";
      if (c === '\r' && text[i + 1] === '\n') i++;
    } else cell += c;
  }
  if (quoted) throw new Error("CSV contains an unclosed quote.");
  row.push(cell);
  if (row.some(value => value.trim())) rows.push(row);
  return rows;
}

function writeCsv(rows: string[][]): string {
  return '\uFEFF' + rows.map(row => row.map(value =>
    '"' + value.replace(/"/g, '""') + '"'
  ).join(',')).join('\r\n') + '\r\n';
}

const clean = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]/g, "");

function charge(value: string): string {
  const result = value.trim();
  if (!/^\d+(?:\.\d+)?$/.test(result) || !Number.isFinite(Number(result))) {
    throw new Error("Invalid parking charge: " + value + ". Use a non-negative number.");
  }
  return result;
}

export function horizontalParkingCsv(text: string): string {
  const [headers, ...rows] = readCsv(text);
  if (!headers) throw new Error("The parking sample is empty.");
  const h = headers.map(clean);
  const name = h.indexOf('hotspotname');
  const location = h.indexOf('hotspotlocation');
  const vehicle = h.findIndex(value =>
    ['vehicletype', 'vehicletypetitle'].includes(value));
  const amount = h.indexOf('parkingcharge');
  if ([name, location, vehicle, amount].some(index => index < 0)) {
    throw new Error("Unexpected parking sample headers. No file was downloaded.");
  }
  const vehicles: string[] = [];
  const groups = new Map<string, {
    name: string;
    location: string;
    charges: Map<string, string>;
  }>();

  for (const row of rows) {
    if (row.length !== headers.length) {
      throw new Error("Parking sample has an invalid row.");
    }
    const n = row[name].trim();
    const l = row[location].trim();
    const v = row[vehicle].trim();
    if (!n || !l || !v || /[\r\n]/.test(n + l + v)) {
      throw new Error("Parking sample contains missing or unsupported names or locations.");
    }
    const value = charge(row[amount]);
    if (!vehicles.includes(v)) vehicles.push(v);
    const key = JSON.stringify([n, l]);
    if (!groups.has(key)) {
      groups.set(key, { name: n, location: l, charges: new Map() });
    }
    const group = groups.get(key)!;
    if (group.charges.has(v)) {
      throw new Error("Duplicate parking pair: " + n + " / " + v);
    }
    group.charges.set(v, value);
  }
  if (!vehicles.length) {
    throw new Error("No parking sample records are available.");
  }
  return writeCsv([
    ['S.NO', 'Hotspot Name', 'Hotspot Location', ...vehicles],
    ...Array.from(groups.values(), (group, index) => [
      String(index + 1), group.name, group.location,
      ...vehicles.map(vehicle => group.charges.get(vehicle) ?? '')
    ])
  ]);
}

export function verticalParkingCsv(text: string): string {
  const [headers, ...rows] = readCsv(text);
  if (!headers) throw new Error("Choose a non-empty CSV file.");
  const h = headers.map(clean);
  const offset = h[0] === 'sno' ? 1 : 0;
  if (h[offset] !== 'hotspotname' || h[offset + 1] !== 'hotspotlocation') {
    throw new Error("Expected Hotspot Name and Hotspot Location as the first columns after S.NO.");
  }

  if (
    h.length === offset + 4 &&
    ['vehicletype', 'vehicletypetitle'].includes(h[offset + 2]) &&
    h[offset + 3] === 'parkingcharge'
  ) {
    return text;
  }

  const vehicles = headers.slice(offset + 2).map(value => value.trim());
  if (
    !vehicles.length ||
    vehicles.some(value => !value || /[\r\n]/.test(value)) ||
    new Set(vehicles.map(value => value.toLowerCase())).size !== vehicles.length
  ) {
    throw new Error("Vehicle column names must be non-empty and unique.");
  }

  const output = [
    ['S.NO', 'Hotspot Name', 'Hotspot Location', 'Vehicle Type', 'Parking Charge']
  ];
  const seen = new Set<string>();

  for (const row of rows) {
    if (row.length !== headers.length) {
      throw new Error("Each CSV row must match the header column count.");
    }
    const name = row[offset].trim();
    const location = row[offset + 1].trim();
    if (!name || !location || /[\r\n]/.test(name + location)) {
      throw new Error("Each row needs a single-line hotspot name and location.");
    }

    const key = JSON.stringify([name.toLowerCase(), location.toLowerCase()]);
    if (seen.has(key)) {
      throw new Error("Duplicate hotspot row: " + name + " / " + location);
    }
    seen.add(key);

    vehicles.forEach((vehicle, index) => {
      const value = row[offset + 2 + index].trim();
      if (value !== '') {
        output.push([
          String(output.length), name, location, vehicle, charge(value)
        ]);
      }
    });
  }
  if (output.length === 1) {
    throw new Error("No charges to upload. Blank charge cells are skipped.");
  }
  return writeCsv(output);
}
