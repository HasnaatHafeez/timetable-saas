import React, { useEffect, useState } from "react";

interface Section {
  id: string;
  name: string;
  code: string;
  capacity: number;
}

const SectionPage: React.FC = () => {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSections();
  }, []);

  const fetchSections = async () => {
    try {
      setLoading(true);

      // 👉 Replace with real API call
      // const response = await axios.get("/api/sections");
      // setSections(response.data);

      // Temporary dummy data
      setSections([
        { id: "1", name: "Section A", code: "SEC-A", capacity: 40 },
        { id: "2", name: "Section B", code: "SEC-B", capacity: 35 },
      ]);
    } catch (error) {
      console.error("Failed to fetch sections", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h2>All Sections</h2>

      {loading ? (
        <p>Loading...</p>
      ) : sections.length === 0 ? (
        <p>No sections found.</p>
      ) : (
        <table border={1} cellPadding={8}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Code</th>
              <th>Capacity</th>
            </tr>
          </thead>
          <tbody>
            {sections.map((section) => (
              <tr key={section.id}>
                <td>{section.name}</td>
                <td>{section.code}</td>
                <td>{section.capacity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default SectionPage;