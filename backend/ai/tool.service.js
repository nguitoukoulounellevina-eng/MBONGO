exports.executeTool = async (nom, params) => {
  return {
    success: true,
    data: null,
    message: `Outil "${nom}" non implémenté.`,
  };
};

exports.getAvailableTools = () => [];
