/**
 * Facebook login
 * Modules, controllers
 * Geolocation service
 */
var app = angular.module('App', []);
var basket = [];
function toggleSignIn() {
  if (!firebase.auth().currentUser) {

    var provider = new firebase.auth.FacebookAuthProvider();

    firebase.auth().signInWithPopup(provider).then(function(result) {

      var token = result.credential.accessToken;

      var user = result.user;

      writeUserData(user.uid, user.displayName, user.email, user.photoURL, "0");

    }).catch(function(error) {

      var errorCode = error.code;
      var errorMessage = error.message;

      var email = error.email;

      var credential = error.credential;

      if (errorCode === 'auth/account-exists-with-different-credential') {
        alert('You have already signed up with a different auth provider for that email.');

      } else {
        console.error(error);
      }

    });

  } else {

    firebase.auth().signOut();

  }

  document.getElementById('quickstart-sign-in').disabled = true;

}

function initApp() {

  firebase.auth().onAuthStateChanged(function(user) {
    if (user) {

      var displayName = user.displayName;
      var email = user.email;
      var emailVerified = user.emailVerified;
      var photoURL = user.photoURL;
      var isAnonymous = user.isAnonymous;
      var uid = user.uid;
      var providerData = user.providerData;



      getUserData(user.uid).then(function(result){

        loadUserProfile(result);

        if(result.authority==1){

          document.getElementById('owner').style.display = 'block';
          document.getElementById('add-new-menu').style.display = 'block';


        } else if(result.authority==0){

          document.getElementById('customer').style.display = 'block';
          document.getElementById('customer-basket').style.display = 'block';

        }

      });

      firebase.database().ref('baskets/'+user.uid+'/').on('value', function(snapshot){

        basket = snapshot.val();

        //console.log(basket);

      });

      document.getElementById('quickstart-sign-in').textContent = 'Log out';

    } else {

      document.getElementById('user-name').textContent = 'Welcome, please login to order';

      document.getElementById('quickstart-sign-in').textContent = 'Log in with Facebook';

    }

    document.getElementById('quickstart-sign-in').disabled = false;

  });

  document.getElementById('quickstart-sign-in').addEventListener('click', toggleSignIn, false);

}

window.onload = function() {
  initApp();
  initMap();
};

function writeUserData(userId, name, email, imageUrl, authority) {
  firebase.database().ref('users/' + userId).set({
    username: name,
    email: email,
    profile_picture : imageUrl,
    authority: authority
  });
}

function getUserData(userId){
  return firebase.database().ref('/users/'+userId).once('value').then(function(snapshot){
    return snapshot.val();

  });
}

function getUsers(){
  return firebase.database().ref('/users/').once('value').then(function(snapshot){
    var usersData = snapshot.val();
  });
}

function loadUserProfile(user){

    if(user.authority==1){
      document.getElementById('user-name').textContent = 'Welcome to '+user.username+'\'s Restaurant';
    } else if(user.authority==0) {
      document.getElementById('user-name').textContent = 'Welcome '+user.username;
    }

    document.getElementById('user-pp').src = user.profile_picture;
}

function postMenu(name, description, imageUrl, price){

  firebase.database().ref('menus/'+firebase.auth().currentUser.uid+'/'+name).push({
    name: name,
    userId: firebase.auth().currentUser.uid,
    description: description,
    imageUrl: imageUrl,
    price: price
  });

  location.reload();
}

function getMenu(menuId){
  return firebase.database().ref('/menus/'+menuId).once('value').then(function(snapshot){
    var menuData = snapshot.val();
  });
}

function getMenus(){
  console.log('entered');
  var menus = firebase.database().ref('/menus/');
  return menus.on('value', function(snapshot){
    var menusData = snapshot.val();
  });
}

function quickBuy(restaurantId, menuName){

  var date = new Date();

  getLocation(firebase.auth().currentUser.uid).then(function(result){
    firebase.database().ref('checkouts/'+restaurantId+'/'+date.getTime()).push({
      userId: firebase.auth().currentUser.uid,
      menuName: menuName,
      address: result,
      status: "Open"
    });

    firebase.database().ref('myCheckouts/'+firebase.auth().currentUser.uid+'/'+date.getTime()).push({
      restaurantId: restaurantId,
      menuName: menuName,
      address: result,
      status: "Open"
    });
    //location.reload();
  });




}

function getLocation(userId){
  return firebase.database().ref('/locations/'+userId+'/').once('value').then(function(snapshot){
    return snapshot.val();
  });

}

function fillBasket(restaurantId, menuName){

  getLocation(firebase.auth().currentUser.uid).then(function(result){
    var address = result;
    var orderedItem = {restaurantId: restaurantId,
                    menuName: menuName,
                    address: address,
                    status: "Open"};

    firebase.database().ref('baskets/'+firebase.auth().currentUser.uid).push({
      restaurantId: orderedItem.restaurantId,
      menuName: orderedItem.menuName,
      address: orderedItem.address,
      status: "Open"
    });


  });
}

function postBasket(restaurantId){
  var date = new Date();
  firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
        firebase.database().ref('myCheckouts/'+user.uid+'/'+date.getTime()).set(
        basket
      );
      firebase.database().ref('checkouts/'+restaurantId+'/'+date.getTime()).set(
        basket
      );
    }
  });
  emptyBasket();
  //location.reload();
}

function emptyBasket(){
  firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
      firebase.database().ref('baskets/'+user.uid).set({
      });
    }
  });
}

//AIzaSyDE9bDX8LUK4Jq5UK7fhGaCJkVxZR5Nbbo geolocation
//AIzaSyDX0S8_8ScJJAOjWS1akfs4Prif2Q_Uh9Q geocoder

var map, infoWindow;
function initMap() {
  map = new google.maps.Map(document.getElementById('map'), {
    center: {lat: -34.397, lng: 150.644},
    zoom: 6
  });
  infoWindow = new google.maps.InfoWindow;

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(position) {
      var pos = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };

      var geocoder = new google.maps.Geocoder;

      geocodeLatLng(geocoder, map, infoWindow, pos);

    }, function() {
      handleLocationError(true, infoWindow, map.getCenter());
    });
  } else {
    handleLocationError(false, infoWindow, map.getCenter());
  }
}

function handleLocationError(browserHasGeolocation, infoWindow, pos) {
  infoWindow.setPosition(pos);
  infoWindow.setContent(browserHasGeolocation ?
                        'Error: The Geolocation service failed.' :
                        'Error: Your browser doesn\'t support geolocation.');
  infoWindow.open(map);
}

function geocodeLatLng(geocoder, map, infowindow, position) {
  geocoder.geocode({'location': position}, function(results, status) {
    if (status === 'OK') {
      if (results[0]) {

        map.setZoom(15);

        var marker = new google.maps.Marker({
          position: position,
          map: map
        });

        infowindow.setContent(results[0].formatted_address);

        firebase.auth().onAuthStateChanged(function(user) {
          if (user) {
            firebase.database().ref('locations/'+user.uid+'/').set({
              position: position,
              address: results[0].formatted_address
            });
          }
        });

        infowindow.open(map, marker);

      } else {
        window.alert('No results found');
      }
    } else {
      window.alert('Geocoder failed due to: ' + status);
    }
  });
}

app.controller('ownerMenusController', function($scope) {
  firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
      firebase.database().ref('/menus/'+user.uid+'/').on('value', function(snapshot){
        $scope.$apply(function(){
          $scope.content = snapshot.val();
        });

      });
    }
  });
});

app.controller('customerMenusController', function($scope) {
  firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
      firebase.database().ref('/menus/'+'T1exK3NDxiP5ZiqTG0oAbF2CJOS2'+'/').on('value', function(snapshot){
        $scope.$apply(function(){
          $scope.content = snapshot.val();
        });
      });
    }
  });
});

app.controller('ownerOrdersController', function($scope) {
  firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
      firebase.database().ref('/checkouts/'+user.uid+'/').on('value', function(snapshot){
        var tempSnapshot={};
        snapshot.forEach(function(childSnapshot){
          Object.assign(tempSnapshot, childSnapshot.val());
          $scope.$apply(function(){
            $scope.content = tempSnapshot;
          });
        });
      });
    }
  });
});



app.controller('customerOrdersController', function($scope) {
  firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
      firebase.database().ref('/myCheckouts/'+'T1exK3NDxiP5ZiqTG0oAbF2CJOS2'+'/').on('value', function(snapshot){
        var tempSnapshot={};
        snapshot.forEach(function(childSnapshot){
          Object.assign(tempSnapshot, childSnapshot.val());
          $scope.$apply(function(){
            $scope.content = tempSnapshot;
            //console.log($scope.content);
          });
        });


      });
    }
  });


});

var theTable = document.getElementById('');

app.controller('quickBuyController', function($scope){

  $scope.quickBuy = function(restaurantId, menuName){
    var confirmation = confirm("Are you sure want to buy "+menuName+"?");
    if(confirmation){
      quickBuy(restaurantId, menuName);
      alert(menuName+" bought successfully!");
    } else {
      alert("Order cancelled.");
    }

  }
});


app.controller('addMenuFormController', function($scope){

  $scope.name = "";
  $scope.description = "";
  $scope.imageUrl = "";
  $scope.price = "";

  $scope.save = function(){
    postMenu($scope.name, $scope.description, $scope.imageUrl, '$'+$scope.price);
  }
});

app.controller('basketController', function($scope){
  var restaurantId = "";
  firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
      firebase.database().ref('baskets/'+user.uid).once('value', function(snapshot){
        snapshot.forEach(function(childSnapshot){
          restaurantId = childSnapshot.val().restaurantId;
        });
        $scope.$apply(function(){
          $scope.content = snapshot.val();
        });
      });
    }
  });

  $scope.fill= function(restaurantId, menuName){
    $scope.restaurantId = restaurantId;
    var confirmation = confirm("Are you sure want to add "+menuName+" to your basket?");
    if(confirmation){
      fillBasket(restaurantId, menuName);
      location.reload();
      alert(menuName+" added to basket successfully!");
    } else {
      alert("Order cancelled.");
    }
  }

  $scope.save = function(){
    postBasket(restaurantId);
    alert("Order successful.");
  }
});


