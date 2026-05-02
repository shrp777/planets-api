# Planets API

API REST exposant les 8 planètes du système solaire.

## Variables d'environnement

- Créer un fichier `.env` à partir du fichier `.env.example`

- **PORT** = port employé dans le conteneur Docker
- **EXTERNAL_PORT** = port employé sur la machine hôte

## Lancement de l'API

```sh
docker compose up --build
````

## Endpoints exposés

- HTTP GET /planets

```JSON
{"data":[{"id":"mercury","name":"Mercury","order":1,"type":"terrestrial"},{"id":"venus","name":"Venus","order":2,"type":"terrestrial"},{"id":"earth","name":"Earth","order":3,"type":"terrestrial"},{"id":"mars","name":"Mars","order":4,"type":"terrestrial"},{"id":"jupiter","name":"Jupiter","order":5,"type":"gas giant"},{"id":"saturn","name":"Saturn","order":6,"type":"gas giant"},{"id":"uranus","name":"Uranus","order":7,"type":"ice giant"},{"id":"neptune","name":"Neptune","order":8,"type":"ice giant"}],"message":"List of the Solar System 8 planets"}
```

- HTTP GET /planets/{id} (ex: /planets/earth)

```JSON
{
    "data":
        {
            "id":"earth",
            "name":"Earth",
            "order":3,
            "type":"terrestrial",
            "diameterKm":12756,
            "massKg":"5.97e24",
            "distanceFromSunAU":1,
            "orbitalPeriodDays":365.25,
            "rotationPeriodHours":23.93,
            "moonsCount":1,
            "hasRings":false,
            "avgTemperatureCelsius":15,
            "description":"The only known planet harboring life, with liquid water on its surface and a protective magnetic field."
        }, 
    "message":"Planet Earth details"
}
```

--

!["Logotype Shrp"](https://sherpa.one/images/sherpa-logotype.png)

**Alexandre Leroux**  
_Enseignant / Formateur_  
_Développeur logiciel web & mobile_

Nancy (Grand Est, France)

<https://shrp.dev>
