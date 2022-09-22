import { Router } from "express";
import { UUIDV4 } from "sequelize";
import db from "../../models/index";
import { validateNewPet } from "../auxiliary/AnimalValidators";
import { Pet } from "../types/petTypes";
import { UserAttributes } from "../types/userTypes";
// import axios from "axios";
//import { UserAttributes } from "../../models/user"
const router = Router();

// ----- ------ ------ FUNCIONES AUXILIARES PARA LAS RUTAS: ------- -------- --------

const getAllUsers = async () => {
  try {
    const allUsers = await db.User.findAll();
    // console.log(allUsers);
    return allUsers;
  } catch (error: any) {
    console.log(error.message);
    return error;
  }
};

// ----- ------ ------- RUTAS :  ------ ------- -------

//GET ALL USERS FROM DB:  //! Hay que dejarla comentada ( o borrarla) porque no es seguro poder tener toda la data de los users registrados:
router.get("/", async (req, res) => {
  console.log("entré al get de Users!");

  try {
    let allTheUsers = await getAllUsers();
    // console.log(allTheUsers);

    return res.status(200).send(allTheUsers);
  } catch (error: any) {
    return res.status(404).send(error.message);
  }
});

// GET NUMBER OF USERS IN DB:

router.get("/numberOfUsersInDB", async (req, res) => {
  console.log("Entré a la route /numberOfUsersInDB");
  try {
    let allUsersInDB = await getAllUsers();
    let numberOfUsersInDB = allUsersInDB.length;
    let numberOfUsersInDBtoString = `${numberOfUsersInDB}`;
    return res.status(200).send(numberOfUsersInDBtoString);
  } catch (error: any) {
    return res.status(404).send(error.message);
  }
});

//! ----- MIDDLEWARE PARA AUTH : ------
const authCheck = (req: any, res: any, next: any) => {
  //ya que tenemos acceso a req.user, podemos chequear si existe(está logueado) o no. Lo mando a "/auth/login" si no está logueado:
  console.log("En el authCheck de /users");
  console.log(req?.user);
  if (!req.user) {
    console.log("redirigiendo al /auth/google");
    res.redirect("/auth/google");
  } else {
    console.log("Usuario autenticado (req.user existe)");
    console.log("continuando con el siguiente middleware");
    next(); //continuá al siguiente middleware, que sería el (req, res) => {} de la ruta get.
  }
};

// GET CONTACT INFO OF USER (AUTH):
// La info de contacto del usuario vamos a obtenerla gracias al :petid. Desde el front tienen que enviarnos el id de la mascota por params, y nosotros buscamos el id de la mascota en la DB para obtener su UserId que tiene asociado.
// Una vez que tener el UserId, vamos a la tabla de Users en la DB y buscamos ese ID.
// Una vez encontrado ese User mediante el ID, obtenemos cierta información para retornarle al cliente. info a obtener: diplayName, email, aditionalContactInfo.
// --
// obtener petID
// buscar en la DB ese petID
// obtener el UserId de esa instancia de Pet
// buscar en la DB en la tabla de Users el id = UserID

router.get("/contactinfo/:petid", async (req, res) => {
  console.log(`Entré a la ruta /users/contactinfo/:petid`);
  console.log(`:petid = ${req.params.petid}`);
  try {
    let petID = req.params.petid;
    let petInDB = await db.Animals.findByPk(petID);
    let ownerID = petInDB.UserId;
    let ownerInDB: UserAttributes = await db.Users.findByPk(ownerID);
    let contactInfoOfOwner = {
      //displayName: ownerInDB.displayName,
      name: ownerInDB.name,
      email: ownerInDB.email,
      city: ownerInDB.city,
      image: ownerInDB.image,
      contact: ownerID.contact,
    };
    console.log(`contactInfoOfOwner = ${contactInfoOfOwner}`);
    return res.status(200).send(contactInfoOfOwner);
  } catch (error: any) {
    console.log(`error en /contactinfo/:petid = ${error.message}`);
    return res.status(404).send(error.message);
  }
});

// GET ALL PETS OF AUTH USER ID:
// obtener todas las instancias de mascotas que tienen como UserId el id del usuario que quiere obtener el listado de mascotas.
// Esta ruta serviría para que un usuario pueda ver su listado de mascotas posteadas, desde su perfíl.
// Hay que ver el req.user.id de la cookie, y buscar en la tabla Animals (mascotas) todas las instancias que tienen como UserId un valor igual al req.user.id.
// Recolectamos esas instancias en un arreglo y enviamos ese arreglo al cliente.
//---
// /users/getallpetsofuser
router.get("/getallpetsofuser", async (req: any, res) => {
  console.log(`Entré a la ruta /users/getallpetsofuser`);
  console.log(`user ID = ${req.query.id}`);
  try {
    let id = req.query.id;
    let petsPostedByUser: Pet[] = await db.Animals.findAll({
      where: {
        UserId: id,
      },
    });
    return res.status(200).send(petsPostedByUser);
  } catch (error: any) {
    console.log(`error en el /users/getallpetsofusers: ${error.message}`);
    return res.status(404).send(error.message);
  }
});

// DELETE PET:
// Esta ruta va a intentar eliminar de la DB una instancia de Animal.
// va a obtener el req.user.id de la cookie, y va a obtener el id de la mascota a eliminar, buscando el req.params.petid.
router.delete("/deletepet/:petid", async (req: any, res) => {
  console.log(`En la ruta users/deletepet/:petid.`);
  console.log(`:petid = ${req.body.petid}`);
  console.log(`req.user.id = ${req.body.id}`);
  try {
    let petID = req.body.petid;
    let userID = req.body.id;
    //buscar instancia de mascota en DB:
    let petToDeleteInDB = await db.Animals.findByPk(petID);
    if (petToDeleteInDB.UserId == userID) {
      //borrar instancia de la DB:
      // await petToDeleteInDB.destroy();
      let deletedPet = await petToDeleteInDB.destroy();
      console.log(
        `pet with id ${petToDeleteInDB.id} and pet.UserId = ${petToDeleteInDB.UserId}...  soft-destroyed`
      );
      return res.status(200).send(deletedPet);
    } else {
      //retornar que no coincide el petToDelete.UserId con el req.user.id
      return res
        .status(400)
        .send(`El ID del cliente no coincide con el UserId de la mascota.`);
    }
  } catch (error: any) {
    console.log(
      `Hubo un error en el users/deletepet/:petid = ${error.message}`
    );
    return res.status(404).send(error.message);
  }
});

router.get('/numbervisitors', async(req,res)=>{
  console.log('Entré a /numbervisitors')
  try {
    let arrayVisitors = await db.Visitor.findAll()
    let numberOfVisitors = arrayVisitors.length
    res.status(200).send(`${numberOfVisitors}`)
  } catch (error) {
    res.status(404).send(error)
  }
})

// Hacer más rutas

router.post('/newuser', async(req,res) => {
  const { email, name, city, contact, image, id} = req.body
  try{
    console.log('new user..', name) 
    let [newUser, created] = await db.User.findOrCreate({
      where: {
        name,
        email,
        id,
        city,
        contact,
        image,
      }
    });
    if(!created){
      res.send('el usuario ya existe')
    } else {
      console.log('se creo')
      res.send(newUser)
    }
  } catch (error) {
    console.log(error)
    res.status(404).send(error)
  }
})


export default router;
