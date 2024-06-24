!(function ($) {

    $(document).ready(function () {

      var navListItems = $('ul.setup-panel li a'), allWells = $('.createstub-content');
      allWells.hide();
      
      navListItems.click(function (e) {
        e.preventDefault();
        var $target = $($(this).attr('href')), $item = $(this).closest('li');
        if (!$item.hasClass('disabled')) {
          navListItems.closest('li').removeClass('active');
          $item.addClass('active');
          allWells.hide();
          $target.show();
        }
      });

      $('ul.setup-panel li.active a').trigger('click');
      $('#activate-step-2').on('click', function (e) {
        $('ul.setup-panel li:eq(1)').removeClass('disabled');
        $('ul.setup-panel li a[href="#step-2"]').trigger('click');
      })

      $('ul.setup-panel li.active a').trigger('click');
      $('#activate-step-3').on('click', function (e) {
        $('ul.setup-panel li:eq(2)').removeClass('disabled');
        $('ul.setup-panel li a[href="#step-3"]').trigger('click');
      })

      $('ul.setup-panel li.active a').trigger('click');
      $('#activate-step-4').on('click', function (e) {
        $('ul.setup-panel li:eq(3)').removeClass('disabled');
        $('ul.setup-panel li a[href="#step-4"]').trigger('click');
      })
    })

    window.addEventListener('load', function () {
      var forms = document.getElementsByClassName('needs-validation');
      var validateGroup = document.getElementsByClassName('validate-me');
      var validation = Array.prototype.filter.call(forms, function (form) {
        form.addEventListener('submit', function (event) {
          if (form.checkValidity() === false) {
            event.preventDefault();
            event.stopPropagation();
          }
          for (var i = 0; i < validateGroup.length; i++) {
            validateGroup[i].classList.add('was-validated');
          }
        }, false);
      });
    }, false);            

  })(jQuery);