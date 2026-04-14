import { useEffect } from "react";
import DynamicTable from "../../components/DynamicTable/DynamicTable";
import { userColumns } from "./userColumns";
import FilterBar from "../../components/FilterBar/FilterBar";
import PageShell from "../../components/PageShell/PageShell";
import { useModal } from "../../components/Modal";
import UserEditModal from "./UserEditModal/UserEditModal";
import { useFilter } from "../../hooks/data/useFilter";
import { userFilterConfig } from "./userFilters";
import { useUsers } from "../../hooks/data/useUsers";
import { useLocationsAndUnits } from "../../hooks/data/useLocationsAndUnits";
import { useMemo } from "react";
import "../../styles/inputs.scss";

const UsersPage = () => {
  const { users, isLoading, error, fetchUsers, editUser, removeUser } =
    useUsers();
  
  const {
    locations: apiLocations,
    units: apiUnits,
    fetchLocations,
    fetchUnitsByLocation,
  } = useLocationsAndUnits();

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const locationOptions = useMemo(
    () => apiLocations.map((l) => ({ label: l.name, value: String(l.id) })),
    [apiLocations]
  );
  const unitOptions = useMemo(
    () => apiUnits.map((u) => ({ label: u.name, value: String(u.id) })),
    [apiUnits]
  );

  const filterConfig = useMemo(
    () => userFilterConfig(locationOptions, unitOptions),
    [locationOptions, unitOptions]
  );

  const { filters, apiParams, handleFilterChange } = useFilter(filterConfig, {
    role: "",
    status: "",
    locationId: "",
    unitId: "",
    search: "",
  });

  useEffect(() => {
    if (filters.locationId) {
      fetchUnitsByLocation(filters.locationId);
    }
    if (!filters.locationId) {
      handleFilterChange("unitId", "");
    }
  }, [filters.locationId, fetchUnitsByLocation, handleFilterChange]);

  useEffect(() => {
    fetchUsers(apiParams);
  }, [fetchUsers, apiParams]);

  const { showConfirm, showModal, closeModal } = useModal();

  const handleEdit = async (userId) => {
    const userToEdit = users.find((u) => u.id === userId);
    if (!userToEdit) return;

    await showModal({
      title: "Kullanıcıyı Düzenle",
      size: "medium",
      content: (closeModal) => (
        <UserEditModal
          user={userToEdit}
          onClose={() => closeModal(null)}
          onSave={async (data) => {
            const result = await editUser(userId, data);
            if (result.success) {
              await fetchUsers(); // Tabloyu güncelle
              closeModal(data);
            } else {
              alert(result.error || "Güncelleme başarısız");
            }
          }}
        />
      ),
    });
  };

  const handleDelete = async (userId) => {
    const confirmed = await showConfirm({
      title: "Kullanıcıyı Sil",
      message: "Bu kullanıcıyı silmek istediğinizden emin misiniz?",
      type: "danger",
      confirmText: "Sil",
      cancelText: "Vazgeç",
    });

    if (confirmed) {
      const result = await removeUser(userId);
      if (result.success) {
        await fetchUsers(); // Tabloyu güncelle
      } else {
        alert(result.error || "Silme başarısız");
      }
    }
  };



  return (
    <PageShell title="Kullanıcılar">
      {/* Filters */}
      <FilterBar
        config={filterConfig}
        filters={filters}
        onFilterChange={handleFilterChange}
      />

      {/* Users Table */}
      <DynamicTable
        columns={userColumns(handleEdit, handleDelete)}
        data={users}
        loading={isLoading}
        pageSize={10}
      />
    </PageShell>
  );
};

export default UsersPage;
