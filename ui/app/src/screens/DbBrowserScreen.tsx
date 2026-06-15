import { useEffect, useState } from "react";
import DbCollectionList from "../components/DbCollectionList";
import DbRecordViewer from "../components/DbRecordViewer";
import type { DbCollection, DbRecord } from "../types/db";
import { listCollections, queryCollection } from "../services/dbBridge";

export default function DbBrowserScreen() {
  const [collections, setCollections] = useState<DbCollection[]>([]);
  const [selected, setSelected] = useState<DbCollection | null>(null);
  const [records, setRecords] = useState<DbRecord[]>([]);
  const [status, setStatus] = useState("Load a collection to inspect stored records.");

  useEffect(() => {
    listCollections().then(setCollections);
  }, []);

  async function handleSelect(c: DbCollection) {
    setSelected(c);
    setStatus("Loading " + c.name + "...");

    const result = await queryCollection({
      outputRoot: "organized_output",
      tier: c.tier,
      collection: c.name
    });

    setRecords(result.records);
    setStatus("Loaded " + result.records.length + " record(s) from " + c.name + ".");
  }

  return (
    <section className="screen-grid">
      <DbCollectionList
        collections={collections}
        selected={
          selected ? selected.tier + ":" + selected.name : undefined
        }
        onSelect={handleSelect}
      />

      <div className="panel">
        <h2>DB Browser Status</h2>
        <p className="muted">{status}</p>
        {selected ? (
          <div className="detail-box">
            <strong>Selected Collection</strong>
            <p>{selected.name}</p>
            <p className="muted">Tier: {selected.tier}</p>
          </div>
        ) : null}
      </div>

      <DbRecordViewer records={records} />
    </section>
  );
}
