const APIResponse = require("../utils/apiResponse");
const { getExpensePrediction } = require("../services/predictionService");

const getPrediction = async (req, res, next) => {
  try {
    const prediction = await getExpensePrediction(req.organizationId);
    return res.json(APIResponse.success(prediction, "Prediction generated"));
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getPrediction
};
