<?php
namespace Timeline;

use Omeka\Module\AbstractModule;
use Zend\Mvc\MvcEvent;
use Zend\ServiceManager\ServiceLocatorInterface;

class Module extends AbstractModule
{
    public function getConfig()
    {
        $cfg = include __DIR__ . '/config/module.config.php';
        return $cfg;
    }

    public function onBootstrap(MvcEvent $event)
    {
        parent::onBootstrap($event);
        error_log("BOOTSTRAP");

        $acl = $this->getServiceLocator()->get('Omeka\Acl');
        $acl->allow(null, [\Timeline\Controller\TimelineController::class]);
    }

    public function upgrade(
        $oldVersion,
        $newVersion,
        ServiceLocatorInterface $serviceLocator
    ) {
        require_once 'data/scripts/upgrade.php';
    }
}
