// Logs the real error and tells the client nothing about the database behind it.
export const serverError = (res, err) => {
  console.error(err);
  return res.status(500).json({ message: "Something went wrong" });
};
