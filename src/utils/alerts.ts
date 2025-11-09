import Swal from 'sweetalert2';

export const confirmSave = async (isEdit: boolean, entity: string) => {
  const res = await Swal.fire({
    title: 'Confirmação',
    text: isEdit ? `Salvar alterações deste ${entity}?` : `Criar novo ${entity}?`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Sim, salvar',
    cancelButtonText: 'Cancelar',
  });
  return res.isConfirmed;
};

export const confirmDelete = async (entity: string) => {
  const res = await Swal.fire({
    title: 'Confirmação',
    text: `Deseja realmente excluir este ${entity}? Esta ação não pode ser desfeita.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Sim, excluir',
    cancelButtonText: 'Cancelar',
  });
  return res.isConfirmed;
};

export const swalSuccess = async (message: string) => {
  await Swal.fire({ title: 'Sucesso', text: message, icon: 'success' });
};

export const swalError = async (title: string, message: string) => {
  await Swal.fire({ title, text: message, icon: 'error' });
};

export const swalValidation = async (message: string) => {
  await Swal.fire('Validação', message, 'warning');
};