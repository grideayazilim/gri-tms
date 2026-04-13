export const userColumns = (handleEdit, handleDelete) => [
  { header: "Kullanıcı Adı", accessor: "username", width: "150px" },
  { header: "Rol", accessor: "role", width: "120px" },
  { header: "Durum", accessor: "status", width: "130px" },
  {
    header: "Yerleşke",
    accessor: "location",
    width: "150px",
    render: (row) => row.unit?.location?.name || "-",
  },
  {
    header: "Birim",
    accessor: "unit",
    width: "150px",
    render: (row) => row.unit?.name || "-",
  },
  {
    header: "Geçerlilik Tarihi",
    accessor: "lastLogin",
    width: "150px",
    render: (row) => row.expiryDate || "-",
  },
  {
    header: "İşlemler",
    width: "100px",
    render: (row) => (
      <div style={{ display: "flex", gap: "8px" }}>
        <button
          className="action-btn edit-btn"
          onClick={() => handleEdit(row.id)}
        >
          ✎
        </button>
        <button
          className="action-btn delete-btn"
          onClick={() => handleDelete(row.id)}
        >
          🗑
        </button>
      </div>
    ),
  },
];
