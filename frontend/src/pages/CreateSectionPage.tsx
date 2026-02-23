import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

interface SectionFormData {
  name: string;
  code: string;
  capacity: number;
}

const CreateSectionPage: React.FC = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState<SectionFormData>({
    name: "",
    code: "",
    capacity: 0,
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;

    setFormData({
      ...formData,
      [name]: name === "capacity" ? Number(value) : value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);

      // 👉 Replace with your API call
      // await axios.post("/api/sections", formData);

      console.log("Section Created:", formData);

      alert("Section created successfully!");

      navigate("/sections"); // redirect to section page
    } catch (error) {
      console.error(error);
      alert("Failed to create section");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h2>Create Section</h2>

      <form onSubmit={handleSubmit} style={{ maxWidth: "400px" }}>
        <div>
          <label>Section Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <label>Section Code</label>
          <input
            type="text"
            name="code"
            value={formData.code}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <label>Capacity</label>
          <input
            type="number"
            name="capacity"
            value={formData.capacity}
            onChange={handleChange}
            required
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? "Creating..." : "Create Section"}
        </button>
      </form>
    </div>
  );
};

export default CreateSectionPage;